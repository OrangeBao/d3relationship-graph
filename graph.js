/**
 * Created by baoyinghai on 10/11/17.
 */
(function(global) {


  // *************

  function getLeftMiddle(box) {
    return {
      x: box.x,
      y: box.y + box.height / 2
    }
  }

  function getMiddleTop(box) {
    return {
      x: box.x + box.width / 2,
      y: box.y
    };
  }

  function getRightMiddle(box) {
    return {
      x: box.x + box.width,
      y: box.y + box.height / 2
    };
  }

  function getMiddleBottom(box) {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height
    };
  }

  function getMinLine(s, e) {
    var pointerS = [
      getLeftMiddle(s),
      getRightMiddle(s)
    ];
    var pointerE = [
      getLeftMiddle(e),
      getRightMiddle(e)
    ];

    var minIndex = - 1;
    var minV ;

    pointerS.reduce(function(obj, sp, si) {
      return pointerE.reduce(function(tmp, ep, ei) {
        tmp.push((sp.x-ep.x)*(sp.x-ep.x) + (sp.y-ep.y)*(sp.y-ep.y));
        return tmp;
      }, obj)
    }, []).forEach(function(item, index) {
      if (minIndex === -1) {
        minIndex = index;
        minV = item;
      } else {
        if (item < minV) {
          minIndex = index;
          minV = item;
        }
      }
    });

    var eIndex = minIndex % pointerE.length;
    var sIndex = (minIndex - eIndex) / pointerS.length;
    return {
      x1: pointerS[sIndex].x,
      y1: pointerS[sIndex].y,
      x2: pointerE[eIndex].x,
      y2: pointerE[eIndex].y
    }

  }
  // **************

  // is connecting ?
  var connect = false;

  function createSvgElement(type) {
    return document.createElementNS("http://www.w3.org/2000/svg", type);
  }

  function getTranslate(obj) {
    var x,y;
    var translate = obj.getAttribute('transform');
    translate.split('(')[1].split(',').forEach(function(item, i) {
      if (i === 0) {
        x = parseInt(item.trim());
      } else {
        y = parseInt(item.trim());
      }
    });

    return { x: x, y: y };
  }

  function moveDecorator(obj) {

    var dragger = false;
    var offsetX = 0;
    var offsetY = 0;
    var x,y;
    obj.addEventListener('mousedown', function(event) {
      var p = getTranslate(obj);
      x = p.x;
      y = p.y;
      dragger = true;
      offsetX = event.offsetX;
      offsetY = event.offsetY;
      obj.emit && obj.emit('movestart');
      function moveHandle(event) {
        if (dragger) {
          obj.emit && obj.emit('moveing', {x: event.offsetX - offsetX, y: event.offsetY - offsetY});
          obj.setAttribute('transform', 'translate(' + (x + event.offsetX - offsetX) + ',' + (y + event.offsetY - offsetY) + ')');
        }
      }
      function upHandle(event) {
        if (dragger) {
          dragger = false;
          var p = getTranslate(obj);
          x = p.x;
          y = p.y;
        }
        window.removeEventListener('mousemove', moveHandle);
        window.removeEventListener('mouseup', upHandle);
      }
      window.addEventListener('mousemove', moveHandle);
      window.addEventListener('mouseup', upHandle);
    });
  }

  function eventDecorator(obj, id) {
    var listeners = {};

    obj.on = function(type, handler) {
      listeners[type] = handler;
    };

    obj.emit = function(type, data) {
      listeners[type]&&listeners[type](data);
    };
  }

  function connectDecorator(obj) {
    var moveHandler = function(event) {
      obj.emit('connecting', {x: event.offsetX-offsetX, y: event.offsetY-offsetY});
    };
    var upHandler = function() {
      if(connect) {
        obj.setAttribute('class', 'pointer');
        connect = false;
      }
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
      obj.emit('connectrelease');
    };
    var offsetX,offsetY;
    obj.addEventListener('mousedown', function(event) {
      event.stopPropagation();
      connect = true;
      obj.emit('connectstart');
      offsetX = event.offsetX;
      offsetY = event.offsetY;
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler)
    });

    obj.addEventListener('mouseover', function(event) {
      obj.setAttribute('class', 'pointer blue');
    });

    obj.addEventListener('mouseout', function(event) {
      if (!connect) {
        obj.setAttribute('class', 'pointer');
      }
    });

    obj.addEventListener('mouseup', function(event) {
      if (connect) {
        console.log('mouseup!!!!');
        obj.emit('connectend');
      }
    });

  }


  var Group = function(options, id, boxs, groupMoveStartHandle, groupMovingHandle, connectStartHandler, connectingHandler, connectendHandler) {
    /**
     * options {x,y}
     * */
    this.options = options;
    this.id = id;
    var g = createSvgElement("g");
    g.setAttribute('transform', 'translate(' + options.x + ',' + options.y + ')');
    eventDecorator(g, id);
    moveDecorator(g);
    this.node = g;

    var offset = 0;
    this.boxs = options.ele.map(function(boxId) {
      var b = new Box(boxs[boxId], offset, connectStartHandler, connectingHandler, connectendHandler, boxId);
      offset += boxs[boxId].height;
      return b;
    });

    var self = this;
    g.on('movestart', function() {
      groupMoveStartHandle(id);
    });

    g.on('moveing', function(data) {
      groupMovingHandle(data.x,data.y)
    });

  };

  Group.prototype.render = function(container) {
    var node = this.node;
    this.boxs.forEach(function(b) {
      b.render(node);
    });
    container.appendChild(node);
  };

  Group.prototype.getBox = function(boxId) {
    var box = this.boxs[this.options.ele.indexOf(boxId)];
    var p = getTranslate(this.node);
    return {
      y: box.offset + p.y,
      x: p.x,
      height: box.height,
      width: box.width
    }
  };

  Group.prototype.hasBox = function(boxId) {
    return this.options.ele.indexOf(boxId) !== -1;
  };

  var Box = function(options, offset, connectStartHandler, connectingHandler, connectendHandler, id) {
    /**
     * options {height, width, id}
     * */
//      this.options = options;
    this.height = options.height;
    this.width = options.width;
    var box = createSvgElement("rect");
    box.setAttribute('class', 'box');
    box.setAttribute('x', 0);
    box.setAttribute('y', offset);
    box.setAttribute('height', this.height);
    box.setAttribute('width', this.width);
    this.node = box;
    this.offset = offset;


    this.pointerLeft = new ConnectPoint({x: 0, y: offset + this.height / 2}, connectStartHandler, connectingHandler, connectendHandler, id);
    this.pointerRight = new ConnectPoint({x: this.width, y: offset + this.height / 2}, connectStartHandler, connectingHandler, connectendHandler, id);
  };

  Box.prototype.render = function(group) {
    group.appendChild(this.node);
    this.pointerLeft.render(group);
    this.pointerRight.render(group);
  };

  var Line = function(options) {
    this.s = options.s;
    this.e = options.e;
    var l = createSvgElement("line");
    l.setAttribute('class', 'line');
    l.setAttribute('marker-end', 'url(#arrow)');
    l.setAttribute('x1', 0);
    l.setAttribute('y1', 0);
    l.setAttribute('x2', 200);
    l.setAttribute('y2', 200);
    this.node = l;
    this.tmpX = 0;
    this.tmpY = 0;
  };

  Line.prototype.dummyLine = function() {
    this.node.setAttribute('class', 'dummy');
  };

  Line.prototype.visible = function() {
    this.node.setAttribute('class', 'dummy visible');
  };

  Line.prototype.render = function(container, p) {
    this.node.setAttribute('x1', p.x1);
    this.node.setAttribute('y1', p.y1);
    this.node.setAttribute('x2', p.x2);
    this.node.setAttribute('y2', p.y2);
    container.appendChild(this.node);
  };

  Line.prototype.setStartXY = function(x, y) {
    this.node.setAttribute('x1', x);
    this.node.setAttribute('y1', y);
    this.node.setAttribute('x2', x);
    this.node.setAttribute('y2', y);
    this.tmpX = x;
    this.tmpY = y;
  };

  Line.prototype.startMove = function(direct) {
    this.tmpX = parseInt(this.node.getAttribute('x' + direct));
    this.tmpY = parseInt(this.node.getAttribute('y' + direct));
  };

  Line.prototype.updateXY = function(direct, x, y) {

    this.node.setAttribute('x' + direct, this.tmpX + x);
    this.node.setAttribute('y' + direct, this.tmpY + y);
  };

  var ConnectPoint = function(options, connectStartHandler, connectingHandler, connectendHandler, id) {
    this.options = options;
    var circle = createSvgElement("circle");
    circle.setAttribute('class', 'pointer');
    circle.setAttribute('r', 5);
    circle.setAttribute('cx', options.x);
    circle.setAttribute('cy', options.y);
    eventDecorator(circle);
    connectDecorator(circle);
    this.node = circle;
    circle.on('connectstart', function() {
      connectStartHandler(id, options.x, options.y)
    });
    circle.on('connecting', function(data) {
      connectingHandler(data)
    });
    circle.on('connectrelease', function(data) {
      connectendHandler();
    });
    circle.on('connectend', function() {
      connectendHandler(id);
    })
  };

  ConnectPoint.prototype.render = function(group) {
    group.appendChild(this.node);
  };

  var Graph = function(options) {
    this.container = document.querySelector('#container');
    this.boxs = options.boxs;
    var self = this;
    this.dummyLine = new Line({});
    this.dummyLine.dummyLine();
    this.groups = options.groups.map(function(group, index) {
      return new Group(group, index, options.boxs, groupMoveStartHandle, groupMovingHandle, connectStartHandler, connectingHandler, connectendHandler);
    });
    this.lines = options.lines.map(function(line) {
      return new Line(line);
    });

    this.effectLines = [];

    function groupMoveStartHandle(groupId) {
      self.effectLines = [];
      // 计算出受影响的line
      var boxList = options.groups[groupId].ele;
      self.lines.forEach(function(line) {

        if (boxList.indexOf(line.s) !== -1) {
          self.effectLines.push({insc: line, direct: '1'});
          line.startMove('1');
        } else if (boxList.indexOf(line.e) !== -1) {
          self.effectLines.push({insc: line, direct: '2'});
          line.startMove('2');
        }
      });
    };

    function groupMovingHandle(x, y) {
      self.effectLines.forEach(function(line) {
        line.insc.updateXY(line.direct, x, y);
      })
    }
    this.startBox = 0;
    this.endBox = 0;
    function connectStartHandler(id, x, y) {
      var box = self.getBox(id);
      self.startBox = id;
      self.dummyLine.setStartXY(box.x + x, box.y + box.height / 2);
      self.dummyLine.visible();
    }

    function connectingHandler(data) {
      self.dummyLine.updateXY('2', data.x,data.y);
    }

    function connectendHandler(id) {

      self.dummyLine.dummyLine();
      if (id !== self.startBox && id !== undefined) {
        self.endBox = id;
        var newLine = {s: self.startBox, e: id};
        options.lines.push(newLine);
        var newLineInstance = new Line(newLine);
        self.lines.push(newLineInstance);
        newLineInstance.render(self.container, getMinLine(self.getBox(self.startBox), self.getBox(id)));
      }
    }
  };

  Graph.prototype.getBox = function(boxId) {
    console.log(boxId);
    if (boxId === undefined) {
      debugger;
    }
    return this.groups.filter(function(g) {
      return g.hasBox(boxId)
    })[0].getBox(boxId);
  };

  Graph.prototype.render = function() {
    this.groups.forEach(function(group) {
      group.render(this.container);
    });
    var self = this;
    this.lines.forEach(function(line) {
      line.render(this.container, getMinLine(self.getBox(line.s), self.getBox(line.e)));
    });
    this.dummyLine.render(this.container, { x1: 0, y1: 0, x2: 0, y2: 0 });
  };


  global.Graph = Graph;
})(window);