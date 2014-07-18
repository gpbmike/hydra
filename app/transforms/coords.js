export default DS.Transform.extend({

  // db -> record
  deserialize: function(serialized) {
    return serialized.split("\n").map(function (coord) {
      var coords = coord.split(',');
      return {
        x: parseFloat(coords[0]),
        y: parseFloat(coords[1])
      };
    });
  },

  // record -> db
  serialize: function(deserialized) {

    var coords = Ember.A([]);

    deserialized.forEach(function (coord) {
      coords.pushObject(coord.x + ',' + coord.y);
    });

    return coords.join("\n");
  }

});
