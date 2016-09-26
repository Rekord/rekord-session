module( 'Rekord Session' );

var Session = Rekord.Session;

test( 'simple save', function()
{
  var prefix = 'simple_save_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = new Task({name: 't0'});

  var sess = new Session();
  sess.watch( t0 );

  t0.$save();

  notOk( t0.$isSaved() );

  sess.save();

  ok( t0.$isSaved() );
});

test( 'simple hasChanges', function(assert)
{
  var prefix = 'simple_hasChanges_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.create({name: 't0'});

  var sess = new Session();
  sess.watch( t0 );

  notOk( sess.hasChanges() );

  t0.done = true;

  ok( sess.hasChanges() );
});

test( 'simple update', function()
{
  var prefix = 'simple_update_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.create({name: 't0'});

  var sess = new Session();
  sess.watch( t0 );

  notOk( sess.hasChanges() );

  t0.done = true;
  t0.name = 't0a';

  ok( sess.hasChanges() );

  t0.$save();

  strictEqual( t0.$saved.name, 't0' );

  sess.save();

  strictEqual( t0.$saved.name, 't0a' );

  notOk( sess.hasChanges() );
});

test( 'simple discard update', function()
{
  var prefix = 'simple_discard_update_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.create({name: 't0'});

  var sess = new Session();
  sess.watch( t0 );

  notOk( sess.hasChanges() );

  t0.done = true;
  t0.name = 't0a';

  ok( sess.hasChanges() );

  t0.$save();

  strictEqual( t0.$saved.name, 't0' );

  sess.discard();

  strictEqual( t0.done, undefined );
  strictEqual( t0.name, 't0' );

  notOk( sess.hasChanges() );
});

test( 'relation cascade save', function(assert)
{
  var prefix = 'relation_cascade_save_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['list_id', 'name', 'done']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        cascadeSave: Rekord.Cascade.All
      }
    }
  });

  var t0 = new Task({id: 1, name: 't0'});
  var t1 = new Task({id: 2, name: 't1'});

  var l0 = TaskList.create({name: 'l0', tasks: [t0, t1]});

  var sess = new Session();
  sess.watch( l0, {
    tasks: true
  });

  notOk( sess.hasChanges() );

  t0.name = 't0a';

  ok( sess.hasChanges() );
  notOk( sess.hasChanges(true) );

  l0.$save();

  strictEqual( t0.$saved.name, 't0' );

  sess.save();

  notOk( sess.hasChanges() );
  strictEqual( t0.$saved.name, 't0a' );
});

test( 'relation no cascade save', function(assert)
{
  var prefix = 'relation_no_cascade_save_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['list_id', 'name', 'done']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        cascadeSave: Rekord.Cascade.None
      }
    }
  });

  var t0 = new Task({id: 1, name: 't0'});
  var t1 = new Task({id: 2, name: 't1'});

  var l0 = TaskList.create({name: 'l0', tasks: [t0, t1]});
  l0.tasks.saveWhere();

  var sess = new Session();
  sess.watch( l0, {
    tasks: true
  });

  notOk( sess.hasChanges() );

  t0.name = 't0a';

  ok( sess.hasChanges() );
  notOk( sess.hasChanges(true) );

  l0.$save();

  strictEqual( t0.$saved.name, 't0' );

  sess.save();

  ok( sess.hasChanges() );
  strictEqual( t0.$saved.name, 't0' );

  t0.$save();

  sess.save();

  notOk( sess.hasChanges() );
  strictEqual( t0.$saved.name, 't0a' );
});

test( 'simple remove', function(assert)
{
  var prefix = 'simple_remove_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.create({id: 1, name: 't0'});

  var sess = new Session();
  sess.watch( t0 );

  notOk( sess.hasChanges() );
  strictEqual( Task.all().length, 1 );

  Task.Database.rest.lastModel = null;

  t0.$remove();

  ok( t0.$isDeleted() );
  ok( sess.hasChanges() );
  strictEqual( Task.all().length, 0 );
  strictEqual( Task.Database.rest.lastModel, null );

  sess.save();

  notOk( sess.hasChanges() );
  strictEqual( Task.all().length, 0 );
  strictEqual( Task.Database.rest.lastModel, t0 );
});

test( 'complex save', function(assert)
{
  var prefix = 'complex_save_';

  var Condition = Rekord({
    name: prefix + 'condition',
    fields: ['group_id', 'name']
  });

  var ConditionGroup = Rekord({
    name: prefix + 'condition_group',
    fields: ['name', 'and_or'],
    hasMany: {
      conditions: {
        model: Condition,
        foreign: 'group_id',
        cascadeSave: Rekord.Cascade.All,
        cascadeRemove: Rekord.Cascade.All,
        comparator: 'id',
        store: Rekord.Store.Model
      }
    }
  });

  var PaymentRule = Rekord({
    name: prefix + 'payment_rule',
    fields: ['group_id', 'settings_id', 'amount'],
    hasOne: {
      group: {
        model: ConditionGroup,
        local: 'group_id',
        cascadeSave: Rekord.Cascade.All,
        cascadeRemove: Rekord.Cascade.All,
        comparator: 'id',
        store: Rekord.Store.Model
      }
    }
  });

  var PaymentSettings = Rekord({
    name: prefix + 'payment_setting',
    fields: ['default_amount'],
    hasMany: {
      rules: {
        model: PaymentRule,
        foreign: 'settings_id',
        cascadeSave: Rekord.Cascade.All,
        cascadeRemove: Rekord.Cascade.All,
        comparator: 'id',
        store: Rekord.Store.Model
      }
    }
  });

  var ps = PaymentSettings.boot({
    id: 1,
    default_amount: 100,
    rules: [
      {
        id: 4,
        group_id: 2,
        settings_id: 1,
        amount: 25,
        group: {
          id: 2,
          name: 'group 1',
          and_or: 'and',
          conditions: [
            {
              id: 6,
              group_id: 2,
              name: 'condition 1'
            }
          ]
        }
      },
      {
        id: 5,
        group_id: 3,
        settings_id: 1,
        amount: 50,
        group: {
          id: 3,
          name: 'group 2',
          and_or: 'or',
          conditions: [
            {
              id: 7,
              group_id: 3,
              name: 'condition 2'
            },
            {
              id: 8,
              group_id: 3,
              name: 'condition 3'
            }
          ]
        }
      }
    ]
  });

  var r0 = PaymentRule.get(4);
  var r1 = PaymentRule.get(5);
  var g0 = ConditionGroup.get(2);
  var g1 = ConditionGroup.get(3);
  var c0 = Condition.get(6);
  var c1 = Condition.get(7);
  var c2 = Condition.get(8);

  ok( r0, 'payment rule 0' );
  ok( r1, 'payment rule 1' );
  ok( g0, 'condition group 0' );
  ok( g1, 'condition group 1' );
  ok( c0, 'condition 0' );
  ok( c1, 'condition 1' );
  ok( c2, 'condition 2' );

  var sess = new Session();

  sess.watch( ps, {
    rules: {
      group: {
        conditions: true
      }
    }
  });

  c0.$remove();

  strictEqual( ps.rules[0].group.conditions.length, 0 );

  var c4 = Condition.create({
    id: 9,
    name: 'condition 4',
    group_id: ps.rules[0].group.id
  })

  notOk( c4.$saved );
  ok( c4, 'condition 3' );
  strictEqual( ps.rules[0].group.conditions.length, 1 );
  ok( sess.hasChanges() );
  strictEqual( Condition.Database.rest.lastModel, null );

  g0.name = 'group 1 a';
  g0.$save()

  strictEqual( g0.$saved.name, 'group 1' );

  sess.save();

  ok( c4.$isSaved() );
  ok( c4.$saved );
  notOk( sess.hasChanges() );
  notStrictEqual( Condition.Database.rest.lastModel, null );
  strictEqual( g0.$saved.name, 'group 1 a' );

  var result = ps.$toJSON();
  var expected = {
    "id":1,
    "default_amount":100,
    "rules":[
      {
        "id":4,
        "group_id":2,
        "settings_id":1,
        "amount":25,
        "group": {
          "id":2,
          "name":
          "group 1 a",
          "and_or":"and",
          "conditions":[
            {"id":9,"group_id":2,"name":"condition 4","$status":0,"$saved":{"id":9,"group_id":2,"name":"condition 4"}}
          ],
          "$status":0,
          "$saved":{"id":2,"name":"group 1 a","and_or":"and"}},"$status":0,"$saved":{"id":4,"group_id":2,"settings_id":1,"amount":25}
      },
      {
        "id":5,
        "group_id":3,
        "settings_id":1,
        "amount":50,
        "group":{
          "id":3,
          "name":"group 2",
          "and_or":"or",
          "conditions":[
            {"id":7,"group_id":3,"name":"condition 2","$status":0,"$saved":{"id":7,"group_id":3,"name":"condition 2"}},
            {"id":8,"group_id":3,"name":"condition 3","$status":0,"$saved":{"id":8,"group_id":3,"name":"condition 3"}}
          ],
          "$status":0,
          "$saved":{"id":3,"name":"group 2","and_or":"or"}
        },
        "$status":0,
        "$saved":{"id":5,"group_id":3,"settings_id":1,"amount":50}
      }
    ]
  };

  deepEqual( result, expected )
});

test( 'complex discard', function(assert)
{
  var prefix = 'complex_discard_';

  var Condition = Rekord({
    name: prefix + 'condition',
    fields: ['group_id', 'name']
  });

  var ConditionGroup = Rekord({
    name: prefix + 'condition_group',
    fields: ['name', 'and_or'],
    hasMany: {
      conditions: {
        model: Condition,
        foreign: 'group_id',
        cascadeSave: Rekord.Cascade.All,
        cascadeRemove: Rekord.Cascade.All,
        comparator: 'id',
        store: Rekord.Store.Model
      }
    }
  });

  var PaymentRule = Rekord({
    name: prefix + 'payment_rule',
    fields: ['group_id', 'settings_id', 'amount'],
    hasOne: {
      group: {
        model: ConditionGroup,
        local: 'group_id',
        cascadeSave: Rekord.Cascade.All,
        cascadeRemove: Rekord.Cascade.All,
        comparator: 'id',
        store: Rekord.Store.Model
      }
    }
  });

  var PaymentSettings = Rekord({
    name: prefix + 'payment_setting',
    fields: ['default_amount'],
    hasMany: {
      rules: {
        model: PaymentRule,
        foreign: 'settings_id',
        cascadeSave: Rekord.Cascade.All,
        cascadeRemove: Rekord.Cascade.All,
        comparator: 'id',
        store: Rekord.Store.Model
      }
    }
  });

  var ps = PaymentSettings.boot({
    id: 1,
    default_amount: 100,
    rules: [
      {
        id: 4,
        group_id: 2,
        settings_id: 1,
        amount: 25,
        group: {
          id: 2,
          name: 'group 1',
          and_or: 'and',
          conditions: [
            {
              id: 6,
              group_id: 2,
              name: 'condition 1'
            }
          ]
        }
      },
      {
        id: 5,
        group_id: 3,
        settings_id: 1,
        amount: 50,
        group: {
          id: 3,
          name: 'group 2',
          and_or: 'or',
          conditions: [
            {
              id: 7,
              group_id: 3,
              name: 'condition 2'
            },
            {
              id: 8,
              group_id: 3,
              name: 'condition 3'
            }
          ]
        }
      }
    ]
  });

  var r0 = PaymentRule.get(4);
  var r1 = PaymentRule.get(5);
  var g0 = ConditionGroup.get(2);
  var g1 = ConditionGroup.get(3);
  var c0 = Condition.get(6);
  var c1 = Condition.get(7);
  var c2 = Condition.get(8);

  ok( r0, 'payment rule 0' );
  ok( r1, 'payment rule 1' );
  ok( g0, 'condition group 0' );
  ok( g1, 'condition group 1' );
  ok( c0, 'condition 0' );
  ok( c1, 'condition 1' );
  ok( c2, 'condition 2' );

  var sess = new Session();

  sess.watch( ps, {
    rules: {
      group: {
        conditions: true
      }
    }
  });

  ok( sess.isWatching( c0 ) );

  c0.$remove();

  notOk( sess.isWatching( c0 ) );

  strictEqual( ps.rules[0].group.conditions.length, 0 );

  var c4 = Condition.create({
    id: 9,
    name: 'condition 4',
    group_id: ps.rules[0].group.id
  })

  ok( sess.isWatching( c4 ) );
  notOk( c4.$saved );
  ok( c4, 'condition 3' );
  strictEqual( ps.rules[0].group.conditions.length, 1 );
  ok( sess.hasChanges() );
  strictEqual( Condition.Database.rest.lastModel, null );

  g0.name = 'group 1 a';
  g0.$save()

  strictEqual( g0.$saved.name, 'group 1' );

  sess.discard();

  notOk( c4.$isSaved() );
  notOk( c4.$saved );
  notOk( sess.hasChanges() );
  notOk( sess.isWatching( c4 ) );
  strictEqual( Condition.Database.rest.lastModel, null );
  notStrictEqual( g0.$saved.name, 'group 1 a' );
  strictEqual( g0.name, 'group 1');
  strictEqual( g0.$saved.name, 'group 1');

  var result = ps.$toJSON();
  var expected = {
    "id":1,
    "default_amount":100,
    "rules":[
      {
        "id":4,
        "group_id":2,
        "settings_id":1,
        "amount":25,
        "group": {
          "id":2,
          "name":
          "group 1",
          "and_or":"and",
          "conditions":[
            {"id":6,"group_id":2,"name":"condition 1","$status":0,"$saved":{"id":6,"group_id":2,"name":"condition 1"}}
          ],
          "$status":0,
          "$saved":{"id":2,"name":"group 1","and_or":"and"}},"$status":0,"$saved":{"id":4,"group_id":2,"settings_id":1,"amount":25}
      },
      {
        "id":5,
        "group_id":3,
        "settings_id":1,
        "amount":50,
        "group":{
          "id":3,
          "name":"group 2",
          "and_or":"or",
          "conditions":[
            {"id":7,"group_id":3,"name":"condition 2","$status":0,"$saved":{"id":7,"group_id":3,"name":"condition 2"}},
            {"id":8,"group_id":3,"name":"condition 3","$status":0,"$saved":{"id":8,"group_id":3,"name":"condition 3"}}
          ],
          "$status":0,
          "$saved":{"id":3,"name":"group 2","and_or":"or"}
        },
        "$status":0,
        "$saved":{"id":5,"group_id":3,"settings_id":1,"amount":50}
      }
    ]
  };

  deepEqual( result, expected )
});

test( 'relation update belongsTo', function(assert)
{
  var prefix = 'relation_update_belongsTo_';

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name']
  });

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['list_id', 'name', 'done'],
    belongsTo: {
      list: {
        model: TaskList,
        local: 'list_id'
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var l1 = TaskList.boot({id: 2, name: 'l0'});
  var t0 = Task.boot({id: 3, list_id: 1, name: 't0', done: false});

  var sess = new Session();

  sess.watch( t0, { list: true } );

  ok( sess.isWatching( l0 ) );
  notOk( sess.isWatching( l1 ) );
  ok( l0.$isSaved() );
  ok( l1.$isSaved() );

  t0.$save( 'list', l1 );

  strictEqual( t0.list, l1 );
  strictEqual( t0.list_id, l1.id );
  notOk( sess.isWatching( l0 ) );
  ok( sess.isWatching( l1 ) );

  sess.save();

  ok( l0.$isSaved() );
  ok( l1.$isSaved() );
  strictEqual( t0.list, l1 );
  strictEqual( t0.list_id, l1.id );
  notOk( sess.isWatching( l0 ) );
  ok( sess.isWatching( l1 ) );
});


test( 'relation update belongsTo discard', function(assert)
{
  var prefix = 'relation_update_belongsTo_discard_';

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name']
  });

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['list_id', 'name', 'done'],
    belongsTo: {
      list: {
        model: TaskList,
        local: 'list_id'
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var l1 = TaskList.boot({id: 2, name: 'l0'});
  var t0 = Task.boot({id: 3, list_id: 1, name: 't0', done: false});

  var sess = new Session();

  sess.watch( t0, { list: true } );

  ok( sess.isWatching( l0 ) );
  notOk( sess.isWatching( l1 ) );
  ok( l0.$isSaved() );
  ok( l1.$isSaved() );

  t0.$save( 'list', l1 );

  strictEqual( t0.list, l1 );
  strictEqual( t0.list_id, l1.id );
  notOk( sess.isWatching( l0 ) );
  ok( sess.isWatching( l1 ) );

  sess.discard();

  ok( l0.$isSaved() );
  ok( l1.$isSaved() );
  strictEqual( t0.list, l0 );
  strictEqual( t0.list_id, l0.id );
  ok( sess.isWatching( l0 ) );
  notOk( sess.isWatching( l1 ) );
});


test( 'relation update hasOne', function(assert)
{
  var prefix = 'relation_update_hasOne_';

  var Permission = Rekord({
    name: prefix + 'permission',
    fields: ['rights']
  });

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'permission_id'],
    hasOne: {
      permission: {
        model: Permission,
        local: 'permission_id'
      }
    }
  });

  var p0 = Permission.boot({id: 1, rights: 'all'});
  var p1 = Permission.boot({id: 2, rights: 'none'});
  var t0 = Task.boot({id: 3, permission_id: 1, name: 't0', done: false});

  var sess = new Session();

  sess.watch( t0, { permission: true } );

  ok( sess.isWatching( p0 ) );
  notOk( sess.isWatching( p1 ) );
  ok( p0.$isSaved() );
  ok( p1.$isSaved() );

  t0.$save( 'permission', p1 );

  strictEqual( t0.permission, p1 );
  strictEqual( t0.permission_id, p1.id );
  notOk( sess.isWatching( p0 ) );
  ok( sess.isWatching( p1 ) );

  sess.save();

  notOk( p0.$isSaved(), 'permission removed when hasOne' );
  ok( p1.$isSaved() );
  strictEqual( t0.permission, p1 );
  strictEqual( t0.permission_id, p1.id );
  notOk( sess.isWatching( p0 ) );
  ok( sess.isWatching( p1 ) );
});


test( 'relation update belongsTo discard', function(assert)
{
  var prefix = 'relation_update_hasOne_discard_';

  var Permission = Rekord({
    name: prefix + 'permission',
    fields: ['rights']
  });

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'permission_id'],
    hasOne: {
      permission: {
        model: Permission,
        local: 'permission_id'
      }
    }
  });

  var p0 = Permission.boot({id: 1, rights: 'all'});
  var p1 = Permission.boot({id: 2, rights: 'none'});
  var t0 = Task.boot({id: 3, permission_id: 1, name: 't0', done: false});

  var sess = new Session();

  sess.watch( t0, { permission: true } );

  ok( sess.isWatching( p0 ) );
  notOk( sess.isWatching( p1 ) );
  ok( p0.$isSaved() );
  ok( p1.$isSaved() );

  t0.$save( 'permission', p1 );

  strictEqual( t0.permission, p1 );
  strictEqual( t0.permission_id, p1.id );
  notOk( sess.isWatching( p0 ) );
  ok( sess.isWatching( p1 ) );

  sess.discard();

  ok( p0.$isSaved() );
  ok( p1.$isSaved() );
  strictEqual( t0.permission, p0 );
  strictEqual( t0.permission_id, p0.id );
  ok( sess.isWatching( p0 ) );
  notOk( sess.isWatching( p1 ) );
});

test( 'cascade save', function()
{
  var prefix = 'cascade_save_';
  var TaskName = prefix + 'task';

  var _t0 = {id: 1, name: 't0', done: 1};
  var _t1 = {id: 2, name: 't1', done: 0};

  var Task_rest = Rekord.rest[ TaskName ] = new TestRest();
  Task_rest.map.put( _t0.id, _t0 );
  Task_rest.map.put( _t1.id, _t1 );

  var Task = Rekord({
    name: TaskName,
    fields: ['name', 'done']
  });

  var t0 = Task.get(1);
  var t1 = Task.get(2);
  var t2 = new Task({id: 3, name: 't2', done: 1});

  var sess = new Session();

  sess.watchMany( [t0, t1, t2] );

  Task.Database.store.lastKey = null;
  Task.Database.rest.lastModel = null;

  assertSaved( t0 );
  assertSaved( t1 );
  assertNew( t2 );

  t0.name = 't0a';

  t0.$save( Rekord.Cascade.Local );
  t1.$remove( Rekord.Cascade.Local );
  t2.$save( Rekord.Cascade.Local );

  strictEqual( Task.Database.store.lastKey, null );
  strictEqual( Task.Database.rest.lastModel, null );

  strictEqual( sess.getSessionWatch( t0 ).cascade,  Rekord.Cascade.Local );
  strictEqual( sess.getRemoveWatch( t1 ).cascade,  Rekord.Cascade.Local );
  strictEqual( sess.getSessionWatch( t2 ).cascade,  Rekord.Cascade.Local );

  ok( t0.$isSaved() );
  ok( t0.$isSavedLocally() );
  ok( t1.$isDeleted() );
  notOk( t2.$isSaved() );
  notOk( t2.$isSavedLocally() );

  sess.save();

  assertSaved( t0 );
  assertStored( t0, {name: 't0a'} );
  assertRest( t0, {name: 't0'} );
  assertRemovedLocally( t1 );
  assertSavedLocally( t2 );
  assertStored( t2, {name: 't2'} );
});

test( 'cascade discard', function()
{
  var prefix = 'cascade_discard_';
  var TaskName = prefix + 'task';

  var _t0 = {id: 1, name: 't0', done: 1};
  var _t1 = {id: 2, name: 't1', done: 0};

  var Task_rest = Rekord.rest[ TaskName ] = new TestRest();
  Task_rest.map.put( _t0.id, _t0 );
  Task_rest.map.put( _t1.id, _t1 );

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.get(1);
  var t1 = Task.get(2);
  var t2 = new Task({id: 3, name: 't2', done: 1});

  var sess = new Session();

  sess.watchMany( [t0, t1, t2] );

  Task.Database.store.lastKey = null;
  Task.Database.rest.lastModel = null;

  assertSaved( t0 );
  assertSaved( t1 );
  assertNew( t2 );

  t0.name = 't0a';

  t0.$save( Rekord.Cascade.Local );
  t1.$remove( Rekord.Cascade.Local );
  t2.$save( Rekord.Cascade.Local );

  strictEqual( Task.Database.store.lastKey, null );
  strictEqual( Task.Database.rest.lastModel, null );

  strictEqual( sess.getSessionWatch( t0 ).cascade,  Rekord.Cascade.Local );
  strictEqual( sess.getRemoveWatch( t1 ).cascade,  Rekord.Cascade.Local );
  strictEqual( sess.getSessionWatch( t2 ).cascade,  Rekord.Cascade.Local );

  ok( t0.$isSaved() );
  ok( t0.$isSavedLocally() );
  ok( t1.$isDeleted() );
  notOk( t2.$isSaved() );
  notOk( t2.$isSavedLocally() );

  sess.discard();

  assertSaved( t0 );
  assertSaved( t1 );
  assertNew( t2 );
});

test( 'tree', function()
{
  var prefix = 'tree_';
  var TaskName = prefix + 'task';

  var Task = Rekord({
    name: TaskName,
    fields: ['name', 'done', 'parent_id'],
    hasMany: {
      children: {
        model: TaskName,
        foreign: 'parent_id'
      }
    }
  });

  var t0 = Task.boot({
    id: 1,
    name: 't0',
    done: false,
    children: [
      {
        id: 2,
        name: 't1',
        done: true
      },
      {
        id: 3,
        name: 't2',
        done: true,
        children: [
          {
            id: 4,
            name: 't3',
            done: false
          }
        ]
      }
    ]
  });

  var t1 = Task.get(2);
  var t2 = Task.get(3);
  var t3 = Task.get(4);

  var sess = new Session();

  var relations = {};
  relations.children = relations;

  sess.watch( t0, relations );

  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );
  ok( sess.isWatching( t2 ) );
  ok( sess.isWatching( t3 ) );

  t2.$remove();

  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );
  notOk( sess.isWatching( t2 ) );
  notOk( sess.isWatching( t3 ) );

  sess.discard();

  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );
  ok( sess.isWatching( t2 ) );
  ok( sess.isWatching( t3 ) );
});

test( 'delayed remove', function(assert)
{
  var prefix = 'delayed_remove_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.boot({id: 1, name: 't0', done: false});

  var sess = new Session();

  sess.watch( t0 );

  ok( sess.isWatching( t0 ) );
  notOk( sess.isRemoved( t0 ) );
  notOk( t0.$isDeleted() );

  t0.$remove();

  notOk( sess.isWatching( t0 ) );
  ok( sess.isRemoved( t0 ) );
  ok( t0.$isDeleted() );

  sess.discard();

  ok( sess.isWatching( t0 ) );
  notOk( sess.isRemoved( t0 ) );
  notOk( t0.$isDeleted() );

  t0.$remove();

  notOk( sess.isWatching( t0 ) );
  ok( sess.isRemoved( t0 ) );
  ok( t0.$isDeleted() );

  sess.save();

  notOk( sess.isWatching( t0 ) );
  notOk( sess.isRemoved( t0 ) ); // it's removed for good

  assertRemoved( t0 );
});

test( 'remove save remove', function(assert)
{
  var prefix = 'remove_save_remove_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = Task.boot({id: 1, name: 't0', done: false});

  var sess = new Session();

  sess.watch( t0 );

  ok( sess.isWatching( t0 ) );
  notOk( sess.isRemoved( t0 ) );
  notOk( t0.$isDeleted() );

  t0.$remove();

  notOk( sess.isWatching( t0 ) );
  ok( sess.isRemoved( t0 ) );
  ok( t0.$isDeleted() );

  sess.discard();

  ok( sess.isWatching( t0 ) );
  notOk( sess.isRemoved( t0 ) );
  notOk( t0.$isDeleted() );

  t0.name = 't0a';
  t0.$save();

  ok( sess.isWatching( t0 ) );
  ok( sess.getSessionWatch( t0 ).save );
  notOk( sess.isRemoved( t0 ) );
  notOk( t0.$isDeleted() );

  sess.discard();

  ok( sess.isWatching( t0 ) );
  notOk( sess.getSessionWatch( t0 ).save );
  notOk( sess.isRemoved( t0 ) );
  notOk( t0.$isDeleted() );

  strictEqual( t0.name, 't0' );

  t0.$remove();

  notOk( sess.isWatching( t0 ) );
  ok( sess.isRemoved( t0 ) );
  ok( t0.$isDeleted() );

  sess.save();

  notOk( sess.isWatching( t0 ) );
  notOk( sess.isRemoved( t0 ) ); // it's removed for good

  assertRemoved( t0 );
});

test( 'relation move', function(assert)
{
  var prefix = 'relation_remove_';
  var TaskName = prefix + 'task';

  var Task = Rekord({
    name: TaskName,
    fields: ['name', 'done', 'parent_id'],
    hasMany: {
      children: {
        model: TaskName,
        foreign: 'parent_id',
        cascadeRemove: Rekord.Cascade.None
      }
    }
  });

  var t0 = Task.boot({id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 2, name: 't1', done: true});
  var t2 = Task.boot({id: 3, name: 't2', done: false, children:[t1]});

  strictEqual( t1.parent_id, t2.id );

  var sess = new Session();

  var relations = {};
  relations.children = relations;

  sess.watch( t0, relations );
  sess.watch( t2, relations );

  strictEqual( t1.parent_id, t2.id );
  strictEqual( t0.children[0], undefined );
  strictEqual( t2.children[0], t1 );

  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );
  ok( sess.isWatching( t2 ) );

  t2.children.unrelate( t1 );

  strictEqual( t1.parent_id, null );
  strictEqual( t0.children[0], undefined );
  strictEqual( t2.children[0], undefined );

  ok( sess.isWatching( t0 ) );
  notOk( sess.isWatching( t1 ) );
  ok( sess.isWatching( t2 ) );

  t0.children.relate( t1 );

  strictEqual( t1.parent_id, t0.id );
  strictEqual( t0.children[0], t1 );
  strictEqual( t2.children[0], undefined );

  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );
  ok( sess.isWatching( t2 ) );

  sess.discard();

  strictEqual( t1.parent_id, t2.id );
  strictEqual( t0.children[0], undefined );
  strictEqual( t2.children[0], t1 );
});

test( 'unrelate no cascade', function(assert)
{
  var prefix = 'unrelate_no_cascade_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id',
        cascadeRemove: Rekord.Cascade.None
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var t0 = Task.boot({id: 2, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 3, list_id: 1, name: 't1', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );

  ok( sess.isWatching( l0 ) );
  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );

  l0.tasks.unrelate( t0 );

  ok( sess.isUnwatched( t0 ) );
  ok( sess.hasChanges() );

  strictEqual( t0.list_id, null );
  deepEqual( l0.tasks.toArray(), [t1], 'tasks updated' );

  sess.discard();

  notOk( sess.hasChanges(), 'no changes as expected' );
  strictEqual( t0.list_id, l0.id, 'fk restored' );
  deepEqual( l0.tasks.toArray(), [t0, t1], 'tasks restored' );

  l0.tasks.unrelate( t0 );

  strictEqual( t0.list_id, null );
  deepEqual( l0.tasks.toArray(), [t1], 'tasks updated' );

  sess.save();

  strictEqual( t0.list_id, null );
  deepEqual( l0.tasks.toArray(), [t1], 'tasks updated' );
});

test( 'unrelate cascade', function(assert)
{
  var prefix = 'unrelate_cascade_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id',
        cascadeRemove: Rekord.Cascade.All
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var t0 = Task.boot({id: 2, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 3, list_id: 1, name: 't1', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );

  ok( sess.isWatching( l0 ) );
  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );

  l0.tasks.unrelate( t0 );

  ok( sess.isRemoved( t0 ) );
  ok( sess.hasChanges() );

  strictEqual( t0.list_id, null );
  deepEqual( l0.tasks.toArray(), [t1], 'tasks updated' );

  sess.discard();

  notOk( sess.hasChanges(), 'no changes as expected' );
  strictEqual( t0.list_id, l0.id, 'fk restored' );
  deepEqual( l0.tasks.toArray(), [t0, t1], 'tasks restored' );

  l0.tasks.unrelate( t0 );

  strictEqual( t0.list_id, null );
  deepEqual( l0.tasks.toArray(), [t1], 'tasks updated' );

  sess.save();

  assertRemoved( t0 );
  strictEqual( t0.list_id, null );
  deepEqual( l0.tasks.toArray(), [t1], 'tasks updated' );
});

test( 'relate', function(assert)
{
  var prefix = 'relate_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id'
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var l1 = TaskList.boot({id: 2, name: 'l1'});
  var t0 = Task.boot({id: 3, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 4, list_id: 1, name: 't1', done: true});
  var t2 = Task.boot({id: 5, list_id: 2, name: 't2', done: true});
  var t3 = new Task({id: 6, name: 't3', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );
  sess.watch( l1, { tasks: true } );

  ok( sess.isWatching( l0 ) );
  ok( sess.isWatching( l1 ) );
  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );
  ok( sess.isWatching( t2 ) );
  notOk( sess.isWatching( t3 ) );

  assertNew( t3 );

  l0.tasks.relate( t3 );

  strictEqual( t3.list_id, l0.id );
  strictEqual( l0.tasks.length, 3 );
  strictEqual( l1.tasks.length, 1 );

  l0.tasks.relate( t2 );

  strictEqual( t2.list_id, l0.id );
  strictEqual( l0.tasks.length, 4 );
  strictEqual( l1.tasks.length, 0 );
});

test( 'unrelate all no cascade', function(assert)
{
  var prefix = 'unrelate_all_no_cascade_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id',
        cascadeRemove: Rekord.Cascade.None
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var t0 = Task.boot({id: 2, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 3, list_id: 1, name: 't1', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );

  ok( sess.isWatching( l0 ) );
  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );

  l0.tasks.unrelate();

  ok( sess.isUnwatched( t0 ) );
  ok( sess.isUnwatched( t1 ) );
  ok( sess.hasChanges() );

  strictEqual( t0.list_id, null );
  strictEqual( t1.list_id, null );
  deepEqual( l0.tasks.toArray(), [], 'tasks updated' );

  sess.discard();

  notOk( sess.hasChanges(), 'no changes as expected' );
  strictEqual( t0.list_id, l0.id, 'fk restored' );
  strictEqual( t1.list_id, l0.id, 'fk restored' );
  deepEqual( l0.tasks.toArray(), [t0, t1], 'tasks restored' );

  l0.tasks.unrelate();

  strictEqual( t0.list_id, null );
  strictEqual( t1.list_id, null );
  deepEqual( l0.tasks.toArray(), [], 'tasks updated' );

  sess.save();

  strictEqual( t0.list_id, null );
  strictEqual( t1.list_id, null );
  deepEqual( l0.tasks.toArray(), [], 'tasks updated' );
});

test( 'unrelate all cascade', function(assert)
{
  var prefix = 'unrelate_all_cascade_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id',
        cascadeRemove: Rekord.Cascade.All
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var t0 = Task.boot({id: 2, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 3, list_id: 1, name: 't1', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );

  ok( sess.isWatching( l0 ) );
  ok( sess.isWatching( t0 ) );
  ok( sess.isWatching( t1 ) );

  l0.tasks.unrelate();

  ok( sess.isRemoved( t0 ) );
  ok( sess.isRemoved( t1 ) );
  ok( sess.hasChanges() );

  strictEqual( t0.list_id, null );
  strictEqual( t1.list_id, null );
  deepEqual( l0.tasks.toArray(), [], 'tasks updated' );

  sess.discard();

  notOk( sess.hasChanges(), 'no changes as expected' );
  strictEqual( t0.list_id, l0.id, 'fk restored' );
  strictEqual( t1.list_id, l0.id, 'fk restored' );
  deepEqual( l0.tasks.toArray(), [t0, t1], 'tasks restored' );

  l0.tasks.unrelate();

  strictEqual( t0.list_id, null );
  strictEqual( t1.list_id, null );
  deepEqual( l0.tasks.toArray(), [], 'tasks updated' );

  sess.save();

  assertRemoved( t0 );
  strictEqual( t0.list_id, null );
  strictEqual( t1.list_id, null );
  deepEqual( l0.tasks.toArray(), [], 'tasks updated' );
});

test( 'promise success', function(assert)
{
  var prefix = 'promise_success_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id',
        cascadeRemove: Rekord.Cascade.All
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var t0 = Task.boot({id: 2, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 3, list_id: 1, name: 't1', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );

  t0.done = true;
  t0.$save();

  expect( 2 );

  ok( sess.hasChanges() );

  var promise = sess.save();

  promise.success(function()
  {
    notOk( t0.$hasChanges() );
  });

  promise.failure(function()
  {
    ok();
  });
});

test( 'promise failure', function(assert)
{
  var prefix = 'promise_failure_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done', 'list_id']
  });

  var TaskList = Rekord({
    name: prefix + 'list',
    fields: ['name'],
    hasMany: {
      tasks: {
        model: Task,
        foreign: 'list_id',
        comparator: 'id',
        cascadeRemove: Rekord.Cascade.All
      }
    }
  });

  var l0 = TaskList.boot({id: 1, name: 'l0'});
  var t0 = Task.boot({id: 2, list_id: 1, name: 't0', done: false});
  var t1 = Task.boot({id: 3, list_id: 1, name: 't1', done: true});

  var sess = new Session();

  sess.watch( l0, { tasks: true } );

  t0.done = true;
  t0.$save();

  expect( 3 );

  ok( sess.hasChanges() );

  Task.Database.rest.status = 500;

  var promise = sess.save();

  promise.success(function()
  {
    ok();
  });

  promise.failure(function()
  {
    ok( t0.$hasChanges() );
  });

  ok( sess.hasChanges(), 'still have changes of course' );
});

test( 'remove new', function(assert)
{
  var prefix = 'remove_new_';

  var Task = Rekord({
    name: prefix + 'task',
    fields: ['name', 'done']
  });

  var t0 = new Task({name: 't0', done: false});
  var t1 = Task.create({name: 't1', done: true});

  var sess = new Session();

  sess.watchMany( [t0, t1] );

  ok( sess.hasChanges(), 'changes exist due to new model' );

  sess.unwatch( t0 );

  notOk( sess.hasChanges(), 'new model removed, no changes' );

  t1.name = 't1a';

  ok( sess.hasChanges(), 'changes were made' );
});
