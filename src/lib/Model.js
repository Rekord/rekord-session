
replaceMethod( Model.prototype, '$save', function($save)
{
  return function(setProperties, setValue, cascade)
  {
    var fakeIt = this.$session && this.$session.isActive();

    if ( this.$isDeleted() )
    {
      Rekord.debug( Rekord.Debugs.SAVE_DELETED, this.$db, this );

      return Promise.resolve( this );
    }

    if ( fakeIt )
    {
      var cascade =
        (arguments.length === 3 ? cascade :
          (arguments.length === 2 && isObject( setProperties ) && isNumber( setValue ) ? setValue :
            (arguments.length === 1 && isNumber( setProperties ) ?  setProperties : this.$db.cascade ) ) );

      this.$set( setProperties, setValue );

      this.$session.saveModel( this, cascade );

      return Promise.resolve( this );
    }

    return $save.apply( this, arguments );
  };
});

replaceMethod( Model.prototype, '$remove', function($remove)
{
  return function(cascade)
  {
    var ignoreExists = this.$session && this.$session.isSaving();
    var fakeIt = this.$session && this.$session.isActive();

    if ( !this.$exists() && !ignoreExists )
    {
      return Promise.resolve( this );
    }

    if ( fakeIt )
    {
      this.$session.removeModel( this, cascade );

      return Promise.resolve( this );
    }

    return $remove.apply( this, arguments );
  };
});
