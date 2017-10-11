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
    this.groups = this.options.groups || [];
  };

  Graph.prototype.layoutInfo = function() {
    return {
      boxs: this.boxs,
      lines: this.lines
    };
  };

  Graph.prototype.offsetY = function(gindex, index) {
    var ary = this.groups[gindex].ele;
    var ret = 0;
    for(var i=0; i < index;i++) {
      ret += this.boxs[ary[i]].height;
    }
    return ret;

  };

  Graph.prototype.drawGroup = function(group, r) {
    var self = this;
    var groupWrapper = this.container.append('g');
    groupWrapper
      .attr('id', this.createGroupId(r))
      .attr('transform', 'translate(' + group.x + ',' + group.y + ')');
    var eles = group.ele;
    var x = 0,
      y = 0,
      boxs = this.boxs,
      textSize = this.textSize,
      paddingLeft = this.paddingLeft,
      paddingTop = this.paddingTop;
    eles.forEach(function(item, i) {
      var groupBox = groupWrapper.append('g');
      groupBox.append('rect')
        .attr('class', 'box')
        .attr('x', x)
        .attr('y', y)
        .attr('width', boxs[item].width)
        .attr('height', boxs[item].height);

      // draw Text
      groupBox.append('text')
        .attr('class', 'text')
        .attr('font-size', textSize + 'px')
        .attr('x', paddingLeft) // TODO: 调整文字布局
        .attr('y', y + textSize + paddingTop)
        .text(boxs[item].text);

      var handle = self.d3.behavior.drag()
        .origin(function() {
          return {};
        });
      handle.on('dragstart', function() {
        var eCircle = self.d3.select(d3.event.sourceEvent.target);
        lineSx = myParseInt(eCircle.attr('cx')) + group.x;
        lineSy = myParseInt(eCircle.attr('cy')) + group.y;
        dummyLine.attr('x1', lineSx).attr('y1', lineSy);
        dragging = true;
        self.d3.event.sourceEvent.stopPropagation();
      });


      handle.on('dragend', function() {
        dragging = false;
        // console.log('dragEnd1');
        var eCircle = self.d3.select(d3.event.sourceEvent.target);
        if (eCircle.attr('pid') !== null) {
          self.addLine({s: item, e: myParseInt(eCircle.attr('pid'))});
        }
        dummyLine.style("display", "none");
      });

      var circleR = 2;

      groupBox.append('circle')
        .attr('class', 'pointer')
        .attr('r', circleR)
        .attr('cx', x)
        .attr('cy', y + boxs[item].height / 2)
        .attr('pid', item)
        .call(handle);

      groupBox.append('circle')
        .attr('class', 'pointer')
        .attr('r', circleR)
        .attr('cx', x + boxs[item].width)
        .attr('cy', y + boxs[item].height / 2)
        .attr('pid', item)
        .call(handle);


      var groupHandle = this.d3.behavior.drag()
        .origin(function() {
          return {x: self.groups[r].x, y: self.groups[r].y };
        });

      groupHandle.on('dragstart', function() {
        self.d3.event.sourceEvent.stopPropagation();
      });

      groupHandle.on('drag', function() {
        groupWrapper.attr('transform', 'translate(' + d3.event.x + ',' + d3.event.y + ')');

        // debugger;
        self.groups[r].ele.forEach(function(index, gindex) {
          getRelativeLines(self.lines, index).forEach(function(item) {
            console.log('lineIndex:', item.index);
            var line = self.d3.select('#' + self.createLineId(item.index));
            var s = self.boxs[item.s];
            var e = self.boxs[item.e];
            // debugger;
            if (item.s === index) {
              s.x = myParseInt(self.d3.event.x);
              s.y = myParseInt(self.d3.event.y + self.offsetY(r, gindex));
            } else {
              e.x = myParseInt(self.d3.event.x);
              e.y = myParseInt(self.d3.event.y +  self.offsetY(r, gindex));
            }
            var newLine = getMinLine(s, e);
            line.attr('x1', newLine.x1).attr('x2', newLine.x2).attr('y1', newLine.y1).attr('y2', newLine.y2);
          })
        });

      });

      groupHandle.on('dragend', function() {
        var translate = self.getTransformXY(groupWrapper);
        self.groups[r].x = translate.x;
        self.groups[r].y = translate.y;
        self.groups[r].ele.forEach(function(g, index) {
          self.boxs[g].x = translate.x;
          self.boxs[g].y = translate.y + self.offsetY(r, index);
        })
      });

      if (group.moveable !== false) {
        // add listener
        groupWrapper.call(groupHandle);
      }
      boxs[item].x = group.x + x;
      boxs[item].y = group.y + y;
      y+= boxs[item].height;

    });
  };

  Graph.prototype.display = function() {
    var self = this;

    if (this.groups.length > 0) {
      for (var r = 0; r < this.groups.length; r++) {
        this.drawGroup(this.groups[r], r);
      }
    } else {
      for(var i = 0; i < this.boxs.length ; i++) {
        this.drawBox(this.boxs[i], i);
      }
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
      dummyLine.attr('x2', self.d3.event.x - rad).attr('y2', self.d3.event.y - rad);
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

  Graph.prototype.createGroupId = function(i) {
    return 'group_' + i;
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

  Graph.prototype.createBoxId = function(i) {
    return 'box_' + i;
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


  global.Graph = Graph;
})(window);