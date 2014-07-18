import Ember from 'ember';

export default Ember.View.extend({

  tagName: 'canvas',

  init: function () {
    this.ref = new Firebase('https://hydra.firebaseio.com/snakes');

    this._super.apply(this, arguments);
  },

  ctx: null,

  food: null,

  cellWidth: 10,
  canvasWidth: 450,
  canvasHeight: 450,

  createGame: function () {

    Ember.Logger.log('Creating game.');

    this.createSnake();
    this.createFood();

  },

  createSnake: function () {

    Ember.Logger.log('Creating snake.');

    this.set('direction', 'right');

    var snake = this.getWithDefault('snake', this.get('context').store.createRecord('snake'));

    snake.set('score', 0);

    var segments = Ember.A([]);

    var length = 5; // Length of the snake
    for (var i = length-1; i>=0; i--) {
      // This will create a horizontal snake starting from the top left
      segments.pushObject(Ember.Object.create({ x: i, y: 0 }));
    }

    snake.set('coords', segments).save();

    // kill the snake when you leave
    this.ref.child(snake.get('id')).onDisconnect().remove();

    this.set('snake', snake); // Empty array to start with
  },

  createFood: function () {

    Ember.Logger.log('Creating food.');

    var w = this.get('canvasWidth'),
        h = this.get('canvasHeight'),
        cw = this.get('cellWidth');

    this.set('food', Ember.Object.create({
      x: Math.round(Math.random() * (w - cw) / cw),
      y: Math.round(Math.random() * (h - cw) / cw)
    }));
  },

  paint: function () {

    // To avoid the snake trail we need to paint the BG on every frame
    // Lets paint the canvas now
    this.clearCanvas();

    this.set('occupied', Ember.A([]));

    // Paint all the snakes
    this.get('snakes').forEach(function (snake) {
      var coords = snake.getWithDefault('coords', []);
      coords.forEach(this.paintCell.bind(this));
      this.get('occupied').addObjects(coords.map(function (coord) {
        return coord.x + ',' + coord.y;
      }));
    }, this);

    // Paint the food
    this.paintCell(this.get('food'));

    // Lets paint the score
    var score_text = "Score: " + this.get('snake.score');
    this.get('ctx').fillText(score_text, 5, this.get('canvasHeight') - 5);

    this.set('paintLater', Ember.run.later(this.paint.bind(this), 60));

  },

  moveSnake: function () {

    // The movement code for the snake to come here.
    // The logic is simple
    // Pop out the tail cell and place it infront of the head cell
    var nx = this.get('snake.coords.firstObject.x');
    var ny = this.get('snake.coords.firstObject.y');

    // These were the position of the head cell.
    // We will increment it to get the new head position
    // Lets add proper direction based movement now
    switch (this.get('direction')) {
    case 'right':
      nx = nx + 1;
      break;
    case 'left':
      nx = nx - 1;
      break;
    case 'up':
      ny = ny - 1;
      break;
    case 'down':
      ny = ny + 1;
      break;
    }

    // Lets add the game over clauses now
    // This will restart the game if the snake hits the wall
    // Lets add the code for body collision
    // Now if the head of the snake bumps into its body, the game will restart
    if (this.checkCollision(nx, ny, this.get('snake'))) {
      Ember.Logger.warn('Collision, restarting.');

      // restart game
      this.createSnake();

    } else {

      // Lets write the code to make the snake eat the food
      // The logic is simple
      // If the new head position matches with that of the food,
      // Create a new head instead of moving the tail
      var tail;
      if (nx === this.get('food.x') && ny === this.get('food.y')) {
        tail = Ember.Object.create({ x: nx, y: ny });
        this.incrementProperty('snake.score');
        // Create new food
        this.createFood();
      } else {
        tail = this.get('snake.coords').popObject(); // pops out the last cell
        tail.x = nx;
        tail.y = ny;
      }
      // The snake can now eat the food.

      this.get('snake.coords').unshiftObject(tail); // puts back the tail as the first cell

      this.get('snake').save();

    }

    Ember.run.later(this.moveSnake.bind(this), 60);

  },

  paintCell: function (coord) {
    var ctx = this.get('ctx'),
        cw = this.get('cellWidth');

    ctx.fillStyle = "blue";
    ctx.fillRect(coord.x * cw, coord.y * cw, cw, cw);
    ctx.strokeStyle = "white";
    ctx.strokeRect(coord.x * cw, coord.y * cw, cw, cw);
  },

  checkCollision: function (x, y, snake) {
    var w = this.get('canvasWidth'),
        h = this.get('canvasHeight'),
        cw = this.get('cellWidth');

    // See if snake hit a wall
    if (x === -1 || x === w/cw || y === -1 || y === h/cw) {
      Ember.Logger.warn('Hit wall.');
      return true;
    }

    if (this.get('occupied').indexOf(x + ',' + y) >= 0) {
      Ember.Logger.warn('Hit snake.');
      return true;
    }

    return false;
  },

  didInsertElement: function () {

    // Canvas stuff
    this.set('ctx', this.$()[0].getContext("2d"));

    var w = this.$().width();
    var h = this.$().height();

    this.$().attr({
      width: w,
      height: h
    });

    Ember.Logger.info("Canvas is %@ by %@".fmt(w, h));

    this.get('context').store.find('snake').then(function (snakes) {

      this.set('snakes', snakes);

      this.createGame();

      this.paint();
      this.moveSnake();

      this.$().attr('tabindex',0);
      this.$().focus();

    }.bind(this));

  },

  clearCanvas: function () {
    var ctx = this.get('ctx'),
        w = this.get('canvasWidth'),
        h = this.get('canvasHeight');
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, w, h);
  },

  keyDown: function (event) {
    event.preventDefault();

    var key = event.which;
    var d = this.get('direction');

    // We will add another clause to prevent reverse gear
    if (key === 37 && d !== "right") {
      this.set('direction', 'left');
    } else if (key === 38 && d !== "down") {
      this.set('direction', 'up');
    } else if (key === 39 && d !== "left") {
      this.set('direction', 'right');
    } else if (key === 40 && d !== "up") {
      this.set('direction', 'down');
    }
    // The snake is now keyboard controllable
  }

});
