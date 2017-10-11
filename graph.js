/**
 * Created by baoyinghai on 10/11/17.
 */
(function(global) {


  //************ utils *************

  function getRelativeLines(optionsLine, index) {
    var ret = [];
    optionsLine.forEach(function(item, i) {
      if (item.s === index || item.e === index) {
        ret.push({s: item.s, e: item.e, index: i});
      }
    });
    return ret;
  }


  function myParseInt(v) {
    if (!v) {
      return 0;
    }
    return parseInt(v, 10);
  }

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
      getMiddleTop(s),
      getRightMiddle(s),
      getMiddleBottom(s)
    ];
    var pointerE = [
      getLeftMiddle(e),
      getMiddleTop(e),
      getRightMiddle(e),
      getMiddleBottom(e),
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

    var eIndex = minIndex % 4;
    var sIndex = (minIndex - eIndex) / 4;
    return {
      x1: pointerS[sIndex].x,
      y1: pointerS[sIndex].y,
      x2: pointerE[eIndex].x,
      y2: pointerE[eIndex].y
    }

  }

  //*************************

  var dummyLine ;
  var dragging = false;
  var lineSx = 0;
  var lineSy = 0;
  var Graph = function(options) {
    this.options = options || {};
    this.d3 = options.d3;
    if (!this.d3) throw new Error('need d3!');
    this.boxs = options.boxs;
    this.lines = options.lines;
    this.container = d3.select('#' + options.id);
    this.textSize = this.options.textSize || 12;
    this.paddingLeft = this.options.textPaddingLeft || 0;
    this.paddingTop = this.options.textPaddingTop || 0;
  };

  Graph.prototype.layoutInfo = function() {
    return {
      boxs: this.boxs,
      lines: this.lines
    };
  };

  Graph.prototype.display = function() {
    var self = this;

    for(var i = 0; i < this.boxs.length ; i++) {
      this.drawBox(this.boxs[i], i);
    }

    for(var j = 0; j<this.lines.length ;j++) {
      this.drawLine(this.lines[j], j);
    }

    dummyLine = this.container.append('line');
    dummyLine
      .attr('class', 'dummy')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', 0);


    this.container.on('mousemove', function() {
      var rad = 7;
      var x = self.d3.mouse(d3.select('circle').node())[0],
        y = self.d3.mouse(d3.select('circle').node())[1];
      dummyLine.attr('x2', x + rad).attr('y2', y + rad);
      if (dragging) {
        dummyLine.style("display", "block")
      }
    });

  };

  Graph.prototype.transformLine2Coordinate = function(line) {
    return getMinLine(this.boxs[line.s], this.boxs[line.e]);
  };

  Graph.prototype.createLineId = function(i) {
    return 'line_' + i;
  };

  Graph.prototype.drawLine = function(line, i) {
    var dline = this.transformLine2Coordinate(line);
    this.container.append('line')
      .attr('id', this.createLineId(i))
      .attr('class', 'line')
      .attr('x1', dline.x1)
      .attr('y1', dline.y1)
      .attr('x2', dline.x2)
      .attr('y2', dline.y2);
  };

  Graph.prototype.createGroupId = function(i) {
    return 'group_' + i;
  };

  Graph.prototype.getTransformXY = function(boxWrapper) {
    var translate = this.d3.transform(boxWrapper.attr("transform")).translate;
    return { x: myParseInt(translate[0]), y: myParseInt(translate[1])};
  };

  Graph.prototype.addLine = function(line) {
    if (this.lines.filter(function(item){
        return (item.s == line.s && item.e === line.e) || (item.s == line.e && item.e === line.s)
      }).length === 0) {
      this.lines.push(line);
      this.drawLine(line, this.lines.length - 1);
    }
  };

  Graph.prototype.drawBox = function(box, i) {
    var self = this;
    var boxWrapper = this.container.append('g');
    boxWrapper
      .attr('id', this.createGroupId(i))
      .attr('transform', 'translate(' + box.x + ',' + box.y + ')');

    // draw rect
    boxWrapper.append('rect')
      .attr('class', 'box')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', box.width)
      .attr('height', box.height);

    // draw Text
    boxWrapper.append('text')
      .attr('class', 'text')
      .attr('font-size', this.textSize + 'px')
      .attr('x', this.paddingLeft) // TODO: 调整文字布局
      .attr('y', this.textSize + this.paddingTop)
      .text(box.text);

    // Pointer
    var handle = self.d3.behavior.drag()
      .origin(function() {
        return {};
      });
    handle.on('dragstart', function() {
      var eCircle = self.d3.select(d3.event.sourceEvent.target);
      lineSx = myParseInt(eCircle.attr('cx')) + box.x;
      lineSy = myParseInt(eCircle.attr('cy')) + box.y;
      dummyLine.attr('x1', lineSx).attr('y1', lineSy);
      dragging = true;
      self.d3.event.sourceEvent.stopPropagation();
    });

    handle.on('drag', function() {
      // console.log('drag1')
    });

    handle.on('dragend', function() {
      dragging = false;
      // console.log('dragEnd1');
      var eCircle = self.d3.select(d3.event.sourceEvent.target);
      if (eCircle.attr('pid') !== null) {
        self.addLine({s: i, e: myParseInt(eCircle.attr('pid'))});
      }
      dummyLine.style("display", "none");
    });

    var circleR = 2;

    boxWrapper.append('circle')
      .attr('class', 'pointer')
      .attr('r', circleR)
      .attr('cx', 0)
      .attr('cy', box.height/2)
      .attr('pid', i)
      .call(handle);

    boxWrapper.append('circle')
      .attr('class', 'pointer')
      .attr('r', circleR)
      .attr('cx', box.width/2)
      .attr('cy', 0)
      .attr('pid', i)
      .call(handle);

    boxWrapper.append('circle')
      .attr('class', 'pointer')
      .attr('r', circleR)
      .attr('cx', box.width/2)
      .attr('cy', box.height)
      .attr('pid', i)
      .call(handle);

    boxWrapper.append('circle')
      .attr('class', 'pointer')
      .attr('r', circleR)
      .attr('cx', box.width)
      .attr('cy', box.height/2)
      .attr('pid', i)
      .call(handle);


    var boxHandle = this.d3.behavior.drag()
      .origin(function() {
        return {x: self.boxs[i].x, y: self.boxs[i].y };
      });

    boxHandle.on('dragstart', function() {
      // console.log('box');
      self.d3.event.sourceEvent.stopPropagation();
    });

    boxHandle.on('drag', function() {
      // self.emit('drag');
      boxWrapper.attr('transform', 'translate(' + d3.event.x + ',' + d3.event.y + ')');

      // debugger;
      getRelativeLines(self.lines, i).forEach(function(item) {
        var line = self.d3.select('#' + self.createLineId(item.index));
        var s = self.boxs[item.s];
        var e = self.boxs[item.e];
        // debugger;
        if (item.s === i) {
          s.x = myParseInt(self.d3.event.x);
          s.y = myParseInt(self.d3.event.y);
        } else {
          e.x = myParseInt(self.d3.event.x);
          e.y = myParseInt(self.d3.event.y);
        }
        var newLine = getMinLine(s, e);
        line.attr('x1', newLine.x1).attr('x2', newLine.x2).attr('y1', newLine.y1).attr('y2', newLine.y2);
      })
    });

    boxHandle.on('dragend', function() {
      var translate = self.getTransformXY(boxWrapper);
      self.boxs[i].x = translate.x;
      self.boxs[i].y = translate.y;
    });

    if (box.moveable !== false) {
      // add listener
      boxWrapper.call(boxHandle);
    }


  };

  global.Graph = Graph;
})(window);