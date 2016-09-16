# <img src="https://raw.githubusercontent.com/Rekord/rekord/master/images/rekord-color.png" width="60"> Rekord Session

[![Build Status](https://travis-ci.org/Rekord/rekord-session.svg?branch=master)](https://travis-ci.org/Rekord/rekord-session)
[![devDependency Status](https://david-dm.org/Rekord/rekord-session/dev-status.svg)](https://david-dm.org/Rekord/rekord-session#info=devDependencies)
[![Dependency Status](https://david-dm.org/Rekord/rekord-session.svg)](https://david-dm.org/Rekord/rekord-session)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Rekord/rekord-session/blob/master/LICENSE)
[![Alpha](https://img.shields.io/badge/State-Alpha-orange.svg)]()

Rekord is a javascript REST ORM that is offline and real-time capable.

rekord-session enables you to create an experience for your user where they can make any number of changes to various models and their related models and they can perform a mass "Save" or decide to do a mass "Cancel" of changes. rekord-session works seemlessly with existing code, capturing all creations, updates, and removes and simulating them until the session is saved or discarded.

**Installation**

The easiest way to install rekord-session is through bower via `bower install rekord-session`.

- rekord-session.js is `14.0k` (`3.0kb` gzipped)
- rekord-session.min.js is `7.2k` (`2.2kb` gzipped)

### Example

```javascript

// The object we start with
var project = Project.boot({
  id: 1,
  name: 'My Project',
  lists: [
    {
      id: 2,
      name: 'Grocery List',
      items: [
        {
          id: 3,          
          name: 'Milk'
        },
        {
          id: 4,
          name: 'Bread'
        }
      ]
    }
  ]
});

var sess = new Session();

// Watch this object, and its relations (and sub relations)
sess.watch( project, {
  lists: {
    items: true
  }
});

// You can watch a list and all models - you can also specify relations here.
// This doesn't have an effect since this collection is already being watched
// because of the previous statement
sess.watchCollection( project.lists );

// You can create an item and since the List(2) is being watched, this will be
// associated with the session and won't be saved until session.save
Item.create({
  list_id: 2,
  name: 'Taco Seasoning'
});

// Remove an item
Item.get( 4 ).$remove();

// Change something
List.get( 2 ).name = 'My Grocery List';

// The session has changes (an insert, remove, and update)
sess.hasChanges();

// If rekord-validation is added, require valid models
sess.setValidationRequired( true );

// Apply the pending changes and return a promise that resolves when all changes
// are applied.
sess.save();

// Undo all changes (remove created, add the remove back, and restore the list name to its previous value)
sess.discard();

// All changes are ignored by the session after this, they are executed normally
sess.disable();

// You must destroy the session to unregister all the model & collection listeners
// and MOST importantly a model/collection can only be related to a single active
// session at a time.
sess.destroy();

// Forget about this model and all related models
sess.unwatch( project );
```
