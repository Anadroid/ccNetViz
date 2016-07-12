define([
        './ccNetVizMultiLevel',
        './ccNetViz',
        './utils'
    ], 
    function(
        ccNetVizMultiLevel,
        ccNetViz,
        utils
    ){
/**
 *  Copyright (c) 2016, Helikar Lab.
 *  All rights reserved.
 *
 *  This source code is licensed under the GPLv3 License.
 *  Author: Aleš Saska
 */


var ccNetVizInteractive = function(canvas, options){
  var vizScreen,vizScreenTemp,vizLayout;

  var getNodesCnt = (() => {
    return vizScreenTemp.cntShownNodes() + vizScreen.cntShownNodes();
  });
  var getEdgesCnt = (() => {
    return vizScreenTemp.cntShownEdges() + vizScreen.cntShownEdges();
  });
  
  vizScreen = new ccNetViz(canvas, options, getNodesCnt);
  vizScreenTemp = new ccNetViz(canvas, options, getEdgesCnt);
  
    
  var supStructsCreated = false;

  var lastNodeIndex;
  var lastEdgeIndex;
  
  var uniqid = 0;
  
  //with edges id with keys of node ids
  // {1:[4,5], 2:[4]} - node id 1 has associated edge with id 4 and 5, node with id 2 has associated edge 4
  var nodesPositions = {};
  var edgesPositions = {};
  var edgesDirections = {};
  
  
  var toAddNodes = [];
  var toAddEdges = [];
  var toRemoveNodes = [];
  var toRemoveEdges = [];
  
  var actualTempNodes = [];
  var actualTempEdges = [];
  
  var nodes;
  var edges;


  var onRedraw = utils.debounce(function(){
    self.draw.call(self);
    return false;
  }, 5);  
  
  var self = this;
  vizScreen.onRedraw = vizScreenTemp.onRedraw = function(){
    onRedraw();
    return false;
  }
  
  function removeNodes(){
    toRemoveNodes.forEach((n) => {
      if(n.uniqid === undefined)
        return;
      
      if(nodesPositions[n.uniqid] !== undefined){
        //in the normal graph
        var pos = nodesPositions[n.uniqid];
        vizScreen.removeNodeAtPos(pos);
      }else{
        //try to remove from temp graph
        
        for(var i = 0; i < actualTempNodes.length; i++){
          if(actualTempNodes[i].uniqid === n.uniqid){
            actualTempNodes.splice(i,1);
            break;
          }
        }
      }
      
      delete n.uniqid;
    });
  }

  function removeEdges(){
    toRemoveEdges.forEach((e) => {
      if(e.uniqid === undefined)
        return;

      delete edgesDirections[e.source.uniqid][e.target.uniqid];
      
      if(edgesPositions[e.uniqid] !== undefined){
        //in the normal graph
        var pos = edgesPositions[e.uniqid];
        vizScreen.removeEdgeAtPos(pos);
      }else{
        //try to remove from temp graph
        
        for(var i = 0; i < actualTempEdges.length; i++){
          if(actualTempEdges[i].uniqid === e.uniqid){
            actualTempEdges.splice(i,1);
            break;
          }
        }

      }
      
      delete e.uniqid;
    });
  }
  
  function addEdges(){
    toAddEdges.forEach((e) => {
      //already added
      if(e.uniqid !== undefined){
        console.error(e);
        console.error("This edge has been already added, if you want to add same edge twice, create new object with same properties");
        return;
      }
      //already added
      e.uniqid = ++lastEdgeIndex;

      //add this node into temporary chart
      actualTempEdges.push(e);
    });
  }
  
  function addNodes(nodes){
    toAddNodes.forEach((n) => {
      
      //already added
      if(n.uniqid !== undefined){
        console.error(n);
        console.error("This node has been already added, if you want to add same node twice, create new object with same properties");
        return;
      }

      n.uniqid = ++lastNodeIndex;
      
      edgesDirections[n.uniqid] = {};
      actualTempNodes.push(n);
    });
  }
  
  
  function isAnyChange(){
    return toAddEdges.length > 0 || toAddNodes.length > 0 || toRemoveEdges.length > 0 || toRemoveNodes.length > 0;
  }
  
  function createSupportStructs(nodes, edges){
    if(supStructsCreated)
      return;
    
    nodesPositions = {};
    edgesPositions = {};
    edgesDirections = {};

    nodes.forEach(function(n, i){
      n.uniqid = i;
      nodesPositions[n.uniqid] = i;
      edgesDirections[n.uniqid] = {};
    });
    
    edges.forEach(function(e, i){
      e.uniqid = i;
      edgesDirections[e.source.uniqid][e.target.uniqid] = e;
      edgesPositions[e.uniqid] = i;
    });
    
    lastNodeIndex = nodes[nodes.length-1].uniqid;
    lastEdgeIndex = nodes[nodes.length-1].uniqid;
    
    supStructsCreated = true;
  }

  this.set = function(n, e, layout){
    nodes = n;
    edges = e;
    
    vizScreenTemp.set([], [], layout);
    vizScreen.set(nodes, edges, layout);
    
    supStructsCreated = false;
  }
  
  this.removeNode = function(n){
    createSupportStructs(nodes, edges);

    toRemoveNodes.push(n);
    return this;
  }
  
  this.removeNodes = function(nodes){
    nodes.forEach((n) => {
      this.removeNode(n);
    });
    return this;
  }

  this.addEdge = function(e){
    createSupportStructs(nodes, edges);

    var tid = e.target.uniqid;
    var sid = e.source.uniqid;
    
    if(edgesDirections[sid][tid]){
      //this edge was already added
      return this;
    }
    if(edgesDirections[tid][sid]){
      //must remove line and add two curves
      
      toRemoveEdges.push(edgesDirections[tid][sid]);
      
      toAddEdges.push(edgesDirections[tid][sid]);
      toAddEdges.push(edgesDirections[sid][tid] = e);
      
      return this;
    }

    toAddEdges.push(e);
    return this;
  }
  
  this.addNode = function(n){
    createSupportStructs(nodes, edges);

    toAddNodes.push(n);    
    return this;
  }

  
  this.addEdges = function(edges){
    edges.forEach((e) => {
      this.addEdge(e);
    });
    
    return this;
  }

  this.addNodes = function(nodes){
    nodes.forEach((n) => {
      this.addNode(n);
    });

    return this;
  }
  
  this.applyChanges = function(){
    
    actualTempNodes = vizScreenTemp.nodes;
    actualTempEdges = vizScreenTemp.edges;
    
    removeEdges();
    removeNodes();
    addNodes();
    addEdges();
    
    toAddEdges = [];
    toAddNodes = [];
    toRemoveEdges = [];
    toRemoveNodes = [];
    
    
    vizScreenTemp.set(actualTempNodes, actualTempEdges);
    this.draw();
    
    return this;
  }
  
  this.draw = function(){
    vizScreen.draw();
    vizScreenTemp.draw(true);
  }
  
  this.find = function(){
    function sortByDistances(e1, e2){
      return e1.dist2 - e2.dist2;
    }
    
    function mergeArrays(a, b, cmp){
      var r = [];
      r.length = a.length + b.length;

      var i = 0,j=0,k=0;
      
      while (i < a.length && j < b.length)
      {
        if (cmp(a[i],b[j]) < 0)       
          r[k++] = a[i++];
        else        
          r[k++] = b[j++];               
      }

      while (i < a.length)
        r[k++] = a[i++];


      while (j < b.length)
        r[k++] = b[j++];
      
      return r;
    }
    
    var f1 = vizScreen.find.apply(vizScreen, arguments);
    var f2 = vizScreenTemp.find.apply(vizScreen, arguments);
    
    var r = {};
    for(var key in f1){
      r[key] = mergeArrays(f1[key], f2[key], sortByDistances);
    }
    
    return r;
  }


  var exposeMethods = ['resetView', 'resize'];
  var self = this;
  exposeMethods.forEach(function(method){
    (function(method, self){
      self[method] = function(){
        vizScreenTemp[method].apply(vizScreenTemp, arguments);
        return vizScreen[method].apply(vizScreen, arguments);
      };
    })(method, self);
  });
  
};


window.ccNetVizInteractive = module.exports = ccNetVizInteractive;


});