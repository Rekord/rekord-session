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

  sess.discard();

  notOk( c4.$isSaved() );
  notOk( c4.$saved );
  notOk( sess.hasChanges() );
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

// TODO tests

// relation update (hasOne & belongsTo)
// unrelate
// relate
// collection add
// collection adds
// collection remove
// collection removes
// collection reset
// collection clear
