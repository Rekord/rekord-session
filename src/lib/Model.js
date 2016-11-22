
Class.replace( Model, '$save', function($save)
{
  return function(setProperties, setValue, cascade, options)
  {
    var fakeIt = this.$session && this.$session.isActive();

    if ( this.$isDeleted() )
    {
      Rekord.debug( Rekord.Debugs.SAVE_DELETED, this.$db, this );

      return Promise.resolve( this );
    }

    if ( fakeIt )
    {
      if ( isObject( setProperties ) )
      {
        options = cascade;
        cascade = setValue;
        setValue = undefined;
      }
      else if ( isNumber( setProperties ) )
      {
        options = setValue;
        cascade = setProperties;
        setValue = undefined;
        setProperties = undefined;
      }

      if ( !isNumber( cascade ) )
      {
        cascade = this.$db.cascade;
      }

      if ( setProperties !== undefined )
      {
        this.$set( setProperties, setValue );
      }

      this.$session.saveModel( this, cascade, options );

      return Promise.resolve( this );
    }

    return $save.apply( this, arguments );
  };
});

Class.replace( Model, '$remove', function($remove)
{
  return function(cascade, options)
  {
    var ignoreExists = this.$session && this.$session.isSaving();
    var fakeIt = this.$session && this.$session.isActive();

    if ( !this.$exists() && !ignoreExists )
    {
      return Promise.resolve( this );
    }

    if ( fakeIt )
    {
      this.$session.removeModel( this, cascade, options );

      return Promise.resolve( this );
    }

    return $remove.apply( this, arguments );
  };
});
