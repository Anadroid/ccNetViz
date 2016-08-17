define([
    './geomutils'
    ], 
    function(
      geomutils
    ){
/**
 *  Copyright (c) 2016, Helikar Lab.
 *  All rights reserved.
 *
 *  This source code is licensed under the GPLv3 License.
 *  Author: Aleš Saska
 */


function pushUnique(arr, e){
  if(arr.indexOf(e) >= 0)
    return;
  arr.push(e);
}

var interactivityBatch = function(layers, insertTempLayer, draw, nodes, edges, checkUniqId){
    var toAddEdges = [];
    var toAddNodes = [];
    var toRemoveEdges = [];
    var toRemoveNodes = [];
    
    var ePos,nPos,eDirs,lastNodeIndex,lastEdgeIndex;
    
    
    
    function createSupportStructs(nodes, edges){
      nPos = {};
      ePos = {};
      eDirs = {};

      nodes.forEach((n, i) => {
        nPos[n.uniqid] = i;
        eDirs[n.uniqid] = {};
      });
      
      edges.forEach((e, i) => {
        var s = geomutils.edgeSource(e);
        var t = geomutils.edgeTarget(e);

        eDirs[s.uniqid][t.uniqid] = e;
        ePos[e.uniqid] = i;
      });
      
      supStructsCreated = true;
    };

  function doRemoveNodes(nodes){
    nodes.forEach((n) => {
      if(n.uniqid === undefined)
        return;
      
      if(nPos[n.uniqid] !== undefined){
        //in the normal graph
        var pos = nPos[n.uniqid];
        layers.main.removeNodeAtPos(pos);
      }else{
        //try to remove from temp graph
        
        for(var i = 0; i < actualTempNodes.length; i++){
          if(actualTempNodes[i] === n){
            actualTempNodes.splice(i,1);
            break;
          }
        }
      }
      
      n.__uniqid = n.uniqid;
      delete n.uniqid;
    });
  }

  function doRemoveEdges(edges){
    edges.forEach((e) => {
      if(e.uniqid === undefined)
        return;
      
      var s = geomutils.edgeSource(e);
      var t = geomutils.edgeTarget(e);

      delete (eDirs[s.uniqid] || {})[t.uniqid];
      
      if(ePos[e.uniqid] !== undefined){
        //in the normal graph
        var pos = ePos[e.uniqid];
        layers.main.removeEdgeAtPos(pos);
      }else{
        //try to remove from temp graph
        
        for(var i = 0; i < actualTempEdges.length; i++){
          if(actualTempEdges[i] === e){
            actualTempEdges.splice(i,1);
            break;
          }
        }

      }
      
      e.__uniqid = e.uniqid;
      delete e.uniqid;
    });
  }
  
  function doAddEdges(){
    toAddEdges.forEach((e) => {
      //already added in main graph
      if(
        ePos[e.uniqid] !== undefined
      ){
        doRemoveEdges([e]);
      }
      
      if(e.uniqid !== undefined){
        console.error(e);
        console.error("This edge has been already added, if you want to add same edge twice, create new object with same properties");
        return;
      }
      checkUniqId(e);
      
      //add this node into temporary chart
      
      //TODO: Not so efficient >> causes quadratic complexity of adding edges into temporary graph
      pushUnique(actualTempEdges, e);
    });
  }
  
  function doAddNodes(nodes){
    toAddNodes.forEach((n) => {
      if(nPos[n.uniqid] !== undefined){
	doRemoveNodes([n]);
      }
      
      //already added
      if(n.uniqid !== undefined){
        console.error(n);
        console.error("This node has been already added, if you want to add same node twice, create new object with same properties");
        return;
      }
      checkUniqId(n);
      
      eDirs[n.uniqid] = {};

      //TODO: Not so efficient >> causes quadratic complexity of adding nodes into temporary graph
      pushUnique(actualTempNodes, n);
    });
  }

  this.addEdge = (e) => {
    var s = geomutils.edgeSource(e);
    var t = geomutils.edgeTarget(e);
    
    var tid = t.uniqid;
    var sid = s.uniqid;
    
    if((eDirs[sid] || {})[tid]){
      //this edge was already added >> remove it
      doRemoveEdges([e]);
    }
    
    if((eDirs[tid] || {})[sid]){
      //must remove line and add two curves
      
      toAddEdges.push(eDirs[tid][sid]);
      doRemoveEdges([eDirs[tid][sid]]);

      toAddEdges.push(eDirs[sid][tid] = e);
      
      return this;
    }

    toAddEdges.push(e);
    return this;
  };
  
  this.addNode = (n) => {
    toAddNodes.push(n);    
    return this;
  };

  this.removeNode = (n) => {
    toRemoveNodes.push(n);    
    return this;
  };

  this.removeEdge = (e) => {
    toRemoveEdges.push(e);
    return this;
  };
  
  this.applyChanges = () => {
    
    //nothing to do
    if(toRemoveEdges.length === 0 && toRemoveNodes.length === 0 && toAddEdges.length === 0 && toAddNodes.length === 0)
      return this;
    
    actualTempNodes = layers.temp ? layers.temp.nodes : [];
    actualTempEdges = layers.temp ? layers.temp.edges : [];
    
    doRemoveEdges(toRemoveEdges);
    doRemoveNodes(toRemoveNodes);
    doAddNodes();
    doAddEdges();
    
    toAddEdges = [];
    toAddNodes = [];
    toRemoveEdges = [];
    toRemoveNodes = [];
    
    insertTempLayer();
    layers.temp.set(actualTempNodes, actualTempEdges);

    draw();
    
    return this;
  };
  
  createSupportStructs(nodes, edges);
  
}

module.exports = interactivityBatch;

});


 
