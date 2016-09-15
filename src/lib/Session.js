


function Session()
{
  this.status = Status.Active;
}

var Status = Session.Status =
{
  Active: 'active',

  Saving: 'saving',

  Disabled: 'disabled',

  Destroyed: 'destroyed'
};

addMethods( Session.prototype,
{

});
