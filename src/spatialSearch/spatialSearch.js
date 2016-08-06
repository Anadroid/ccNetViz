define(['./rbush', '../geomutils'], function(rbush, ccNetViz_geomutils){

/**
 *  Copyright (c) 2016, Helikar Lab.
 *  All rights reserved.
 *
 *  This source code is licensed under the GPLv3 License.
 *  Author: Aleš Saska - http://alessaska.cz/
 */



var EPS = Number.EPSILON || 1e-14;




//solving cube analyticaly for bezier curves
function cuberoot(x) {
    var y = Math.pow(Math.abs(x), 1/3);
    return x < 0 ? -y : y;
}

function solveCubic(a, b, c, d) {
    if (Math.abs(a) < 1e-8) { // Quadratic case, ax^2+bx+c=0
        a = b; b = c; c = d;
        if (Math.abs(a) < 1e-8) { // Linear case, ax+b=0
            a = b; b = c;
            if (Math.abs(a) < 1e-8) // Degenerate case
                return [];
            return [-b/a];
        }

        var D = b*b - 4*a*c;
        if (Math.abs(D) < 1e-8)
            return [-b/(2*a)];
        else if (D > 0)
            return [(-b+Math.sqrt(D))/(2*a), (-b-Math.sqrt(D))/(2*a)];
        return [];
    }

    // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
    var p = (3*a*c - b*b)/(3*a*a);
    var q = (2*b*b*b - 9*a*b*c + 27*a*a*d)/(27*a*a*a);
    var roots;

    if (Math.abs(p) < 1e-8) { // p = 0 -> t^3 = -q -> t = -q^1/3
        roots = [cuberoot(-q)];
    } else if (Math.abs(q) < 1e-8) { // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
        roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : []);
    } else {
        var D = q*q/4 + p*p*p/27;
        if (Math.abs(D) < 1e-8) {       // D = 0 -> two roots
            roots = [-1.5*q/p, 3*q/p];
        } else if (D > 0) {             // Only one real root
            var u = cuberoot(-q/2 - Math.sqrt(D));
            roots = [u - p/(3*u)];
        } else {                        // D < 0, three roots, but needs to use complex numbers/trigonometric solution
            var u = 2*Math.sqrt(-p/3);
            var t = Math.acos(3*q/p/u)/3;  // D < 0 implies p < 0 and acos argument in [-1..1]
            var k = 2*Math.PI/3;
            roots = [u*Math.cos(t), u*Math.cos(t-k), u*Math.cos(t-2*k)];
        }
    }

    // Convert back from depressed cubic
    for (var i = 0; i < roots.length; i++)
        roots[i] -= b/(3*a);

    return roots;
}

//function distanceToBezier(x,y,ax,ay,bx,by,cx,cy){
function distance2ToBezier(x,y,a,d,b,e,c,f){
  //based on compute derivation of: d/dt ((X - (a*(1-t)*(1-t)+2*b*t*(1-t)+c*t*t))^2 + (Y - (d*(1-t)*(1-t)+2*e*t*(1-t)+f*t*t))^2)
  
  var A =   4*a*a  - 16*a*b + 8*a*c  + 16*b*b - 16*b*c + 4*c*c  + 4*d*d  - 16*d*e + 8*d*f  + 16*e*e - 16*e*f + 4*f*f;
  var B = - 12*a*a + 36*a*b - 12*a*c - 24*b*b + 12*b*c - 12*d*d + 36*d*e - 12*d*f - 24*e*e + 12*e*f;
  var C =   12*a*a - 24*a*b + 4*a*c  - 4*a*x  + 8*b*b  + 8*b*x  - 4*c*x  + 12*d*d - 24*d*e + 4*d*f  - 4*d*y  + 8*e*e + 8*e*y - 4*f*y
  var D = - 4*a*a  + 4*a*b  + 4*a*x  - 4*b*x  - 4*d*d  + 4*d*e  + 4*d*y  - 4*e*y;
    
  var eqresult = solveCubic(A,B,C,D);
  
  
  //loop through all possible solitions to find out which point is the nearest
  var mindist = Infinity;
  for(var i = 0; i < eqresult.length; i++){
    var t = eqresult[i];
    
    if(t < 0 || t > 1)
      continue;
    
    //point at bezier curve
    var px = a*(1-t)*(1-t)+2*b*t*(1-t)+c*t*t;
    var py = d*(1-t)*(1-t)+2*e*t*(1-t)+f*t*t;
    
    var dist = distance2(x,y,px,py);
    if(dist < mindist)
      mindist = dist;
    
  }
  
  return mindist;
}

/*
 * @param v - array of with points [x1,y1,x2,y2 .... ]
 * @return array representing bounding box [x1,y1,x2,y2]
 */
function getBBFromPoints(v){
  var xmin = Infinity;
  var xmax = -xmin;
  var ymin = Infinity;
  var ymax = -ymin;
  
  //x of points - even indexes in array 
  for(var i = 0; i < v.length; i+=2){
    var val = v[i];
    if(val < xmin) xmin = val;
    if(val > xmax) xmax = val;
  }
  
  //y of points - odd indexes in array 
  for(var i = 1; i < v.length; i+=2){
    var val = v[i];
    if(val < ymin) ymin = val;
    if(val > ymax) ymax = val;
  }

  return [xmin, ymin, xmax, ymax];
}

//distance from point to point
function distance2(x1,y1,x2,y2){
  var dx = x1 - x2;
  var dy = y1 - y2;
  return dx * dx + dy * dy;
}

//distance from point to line
function pDistance2(x, y, x1, y1, x2, y2) {
  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of 0 length line
      param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  }
  else if (param > 1) {
    xx = x2;
    yy = y2;
  }
  else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return distance2(x,y,xx,yy);
}

function lineIntersectsLine(l1p1x, l1p1y, l1p2x, l1p2y, l2p1x, l2p1y, l2p2x, l2p2y)
{
    var q = (l1p1y - l2p1y) * (l2p2x - l2p1x) - (l1p1x - l2p1x) * (l2p2y - l2p1y);
    var d = (l1p2x - l1p1x) * (l2p2y - l2p1y) - (l1p2y - l1p1y) * (l2p2x - l2p1x);

    if( d == 0 )
    {
        return false;
    }

    var r = q / d;

    q = (l1p1y - l2p1y) * (l1p2x - l1p1x) - (l1p1x - l2p1x) * (l1p2y - l1p1y);
    var s = q / d;

    if( r < 0 || r > 1 || s < 0 || s > 1 )
    {
        return false;
    }

    return true;
}

function pointInRect(px,py, x1, y1, x2, y2){
  return px >= x1 - EPS && px <= x2 + EPS && py >= y1 - EPS && py <= y2 + EPS
}

function lineIntersectsRect(p1x, p1y, p2x, p2y, r1x, r1y, r2x, r2y)
{
    if(pointInRect(p1x, p1y, r1x, r1y, r2x, r2y) || pointInRect(p2x, p2y, r1x, r1y, r2x, r2y))
      return true;
    
    return lineIntersectsLine(p1x, p1y, p2x, p2y, r1x, r1y, r2x, r1y) ||
        lineIntersectsLine(p1x, p1y, p2x, p2y, r2x, r1y, r2x, r2y) ||
        lineIntersectsLine(p1x, p1y, p2x, p2y, r2x, r2y, r1x, r2y) ||
        lineIntersectsLine(p1x, p1y, p2x, p2y, r1x, r2y, r1x, r1y);
}

function eq(a,b){
  return a >= b-EPS && a <= b+EPS;
}

function neq(a,b){
  return !eq(a,b);
}


function checkBezierTkoef(a,d,b,e,c,f,t,q,s,r,v){
  if(t < 0 || t > 1)
    return false;
  
  if(neq(v-s,0)){
    var x = (d*(1-t)*(1-t)+2*e*t*(1-t)+f*t*t)/(v-s);
    if(x < 0 || x > 1)
      return false;
  }
  
  return true;
}

function bezierIntersectsLine(a,d,b,e,c,f, q,s,r,v){
    //based on wolfram alpha: >> solve ((d*(1-x)*(1-x)+2*e*x*(1-x)+f*x*x) = s + ((-a*(x-1)*(x-1) + x*(2*b*(x-1)-c*x)+q)/(q-r))*(v - s)) for x <<

    var t;
    
    var tden = -a*s+a*v+2*b*s-2*b*v-c*s+c*v+d*q-d*r-2*e*q+2*e*r+f*q-f*r;
    if(neq(tden, 0)){
      if(neq(q-r, 0)){
        var sq1 = 2*a*s-2*a*v-2*b*s+2*b*v-2*d*r+2*e*q-2*e*r;
        var sq = sq1*sq1 - 4*(-a*s+a*v+d*q-d*r-q*v+r*s)*(-a*s+a*v+2*b*s-2*b*v-c*s+c*v+d*q-d*r-2*e*q+2*e*r+f*q-f*r);
        if(sq >= 0){
          var t1 = a*s-a*v-b*s+b*v-d*q+d*r+e*q-e*r;
  
          t = (t1-0.5*Math.sqrt(sq))/tden;
          if(checkBezierTkoef(a,d,b,e,c,f, q,s,r,v,t))
            return true;
  
          t = (t1+0.5*Math.sqrt(sq))/tden;
          if(checkBezierTkoef(a,d,b,e,c,f, q,s,r,v,t))
            return true;
        }
      }
    }

    var tden = -b*s+b*v+c*s-c*v+e*q-e*r-f*q+f*r;
    if(eq(d, 2*e-f) && eq(a,2*b-c) && neq(tden, 0) && neq(q*s-q*v-r*s+r*v,0)){
      t = -2*b*s+2*b*v+c*s-c*v+2*e*q-2*e*r-f*q+f*r-q*v+r*s;
      t = t/(2*tden);
      if(checkBezierTkoef(a,d,b,e,c,f, q,s,r,v,t))
        return true;
    }

    if(eq(s,v) && eq(d,2*e-f) && neq(e-f,0) && neq(q-r,0)){
      t = (2*e-f-v)/(2*(e-f));
      if(checkBezierTkoef(a,d,b,e,c,f, q,s,r,v,t))
        return true;
    }

    var aeq = (2*b*s-2*b*v-c*s+c*v+d*q-d*r-2*e*q+2*e*r+f*q-f*r)/(s-v);
    var val = b*d*s-b*d*v-2*b*e*s+2*b*e*v+b*f*s-b*f*v-c*d*s+c*d*v+2*c*e*s-2*c*e*v-c*f*s+c*f*v-d*e*q+d*e*r+d*f*q-d*f*r+2*e*e*q-2*e*e*r-3*e*f*q+3*e*f*r+f*f*q-f*f*r;
    if(eq(a, aeq) && neq(val,0) && neq(q-r, 0)){
      t = (2*b*s-2*b*v-c*s+c*v-2*e*q+2*e*r+f*q-f*r+q*v-r*s)/(2*(b*s-b*v-c*s+c*v-e*q+e*r+f*q-f*r));
      if(checkBezierTkoef(a,d,b,e,c,f, q,s,r,v,t))
        return true;
    }

    return false;
}

function bezierIntersectsRect(a,d,b,e,c,f, r1x, r1y, r2x, r2y)
{
    if(pointInRect(a, d, r1x, r1y, r2x, r2y) || pointInRect(c, f, r1x, r1y, r2x, r2y))
      return true;
    
    var centerx = (r1x+r2x)/2;
    var centery = (r1y+r2y)/2;
    
    var diffx = r1x-r2x;
    var diffy = r1y-r2y;
    
    //performance optimalization based on distance
    var diff2xy = diffx*diffx + diffy*diffy;
    var dist2 = distance2ToBezier(centerx, centery, a,d,b,e,c,f);
    if(dist2*4 > diff2xy)
      return false;
    if(dist2*4 <= Math.min(diffx*diffx, diffy*diffy))
      return true;

    return bezierIntersectsLine(a,d,b,e,c,f, r1y, r2x, r1y, r1y) ||
        bezierIntersectsLine(a,d,b,e,c,f, r2x, r1y, r2x, r2y) ||
        bezierIntersectsLine(a,d,b,e,c,f, r2x, r2y, r1x, r2y) ||
        bezierIntersectsLine(a,d,b,e,c,f, r1x, r2y, r1x, r1y);
}


var ct = {};
function getEdgeShift(context, screensize, e, ct){
  ccNetViz_geomutils.getCurveShift(e,ct);
  
  var ctx,cty,citx,city;
  
  ctx = -ct.y;
  cty = ct.x * context.aspect2;
  
  var len2 = ctx*context.width*ctx*context.width + cty*context.height*cty*context.height;
  
  if(eq(len2, 0)){
    ctx = 0;
    cty = 0;
  }else{
    var len = Math.sqrt(len2);
    ctx *= context.curveExc * 0.25 * screensize / len;
    cty *= context.curveExc * 0.25 * screensize / len;
  }

  var sizex = 2.5 * context.nodeSize * screensize / context.width;
  var sizey = 2.5 * context.nodeSize * screensize / context.height;
  citx = -ct.cy * 0.5 * sizex;
  city = ct.cx * 0.5 * sizey;
  
  ct.x = ctx + citx;
  ct.y = cty + city;
}

class Node{
  constructor(n){
    this.isNode = true;
    this.e = n;
  };
  getBBox(){
    return [this.e.x-EPS, this.e.y - EPS, this.e.x + EPS, this.e.y + EPS];
  };
  intersectsRect(x1,y1,x2,y2){
    return pointInRect(this.e.x, this.e.y, x1,y1,x2,y2);
  };
  dist2(x,y, context){
    return distance2(x,y,this.e.x,this.e.y);
  };
}

class Line{
  constructor(l){
    this.isEdge = true;
    this.e = l;
  };
  getPoints(context, size){
    var x1,y1,x2,y2;
    
    var s = ccNetViz_geomutils.edgeSource(this.e);
    var t = ccNetViz_geomutils.edgeTarget(this.e);
    
    x1 = s.x;
    y1 = s.y;
    x2 = t.x;
    y2 = t.y;
    
    getEdgeShift(context, size, s.e, ct);
    x1 += ct.x;
    y1 += ct.y;
    getEdgeShift(context, size, t.e, ct);
    x2 += ct.x;
    y2 += ct.y;

    return [x1,y1,x2,y2];
  };
  getBBox(context, size){
    var p = this.getPoints(context, size);
    
    return [Math.min(p[0],p[2]), Math.min(p[1],p[3]), Math.max(p[0],p[2]), Math.max(p[1],p[3])];
  };
  intersectsRect(x1,y1,x2,y2, context, size){
    var p = this.getPoints(context, size);

    return lineIntersectsRect(p[0], p[1], p[2], p[3], x1,y1,x2,y2);
  };
  dist2(x,y, context, size){
    var p = this.getPoints(context, size);

    return pDistance2(x,y,p[0],p[1],p[2],p[3]);
  };
}

class Circle{
  constructor(c){
    this.isEdge = true;
    this.e = c;
  };
  getBezierPoints(context, screensize){
    var x1,y1,s;
    s = ccNetViz_geomutils.edgeSource(this.e);
    x1 = s.x;
    y1 = s.y;

    var size = 2.5 * context.nodeSize * screensize;
    var xsize = size / context.width / 2;
    var ysize = size / context.height / 2;

    var d = s.y < 0.5 ? 1 : -1;

    getEdgeShift(context, size, s.e, ct);
    x1 += ct.x;
    y1 += ct.y;
    
    return [
      x1,
      y1,
      x1 + xsize*1,
      y1 + ysize*d,
      x1,
      y1 + ysize*1.25*d,
      x1 - xsize*1,
      y1 + ysize*d
    ];
  };
  getBBox(context, size){
    var v = this.getBezierPoints(context, size);
    
    return getBBFromPoints(v);
  };
  intersectsRect(x1,y1,x2,y2, context, size, normalize){
    var v = this.getBezierPoints(context,size);
    return bezierIntersectsRect(v[0],v[1],v[2],v[3],v[4],v[5],x1,y1,x2,y2) || bezierIntersectsRect(v[2],v[3],v[4],v[5],v[6],v[7],x1,y1,x2,y2);
  };
  dist2(x,y,context,size){
    var v = this.getBezierPoints(context,size);

    //circle is just 2 bezier curves :)
    var d1 = distance2ToBezier(x,y,v[0],v[1],v[2],v[3],v[4],v[5]);
    var d2 = distance2ToBezier(x,y,v[2],v[3],v[4],v[5],v[6],v[7]);

    return Math.min(d1,d2);
  };
}

class Curve{
  constructor(c){
    this.isEdge = true;
    this.e = c;
  };
  getBezierPoints(context, size, normalize){
    var x1,x2,y1,y2;
    var s = ccNetViz_geomutils.edgeSource(this.e);
    var t = ccNetViz_geomutils.edgeTarget(this.e);

    x1 = s.x;
    y1 = s.y;
    x2 = t.x;
    y2 = t.y; 
    
    var d = normalize(s, t);
    
    var n2 = d.y;
    var n3 = context.aspect2*-d.x;

    var x = context.width * n2;
    var y = context.height* n3;
    var l = Math.sqrt(x*x+y*y)*2;

    n2 *= context.curveExc*size/l;
    n3 *= context.curveExc*size/l;

    getEdgeShift(context, size, s.e, ct);
    x1 += ct.x;
    y1 += ct.y;
    getEdgeShift(context, size, t.e, ct);
    x2 += ct.x;
    y2 += ct.y;

    var ret = [
      x1,
      y1,
      (x1+x2)/2 + n2,
      (y1+y2)/2 + n3,
      x2,
      y2
    ];
    return ret;
  };
  intersectsRect(x1,y1,x2,y2, context, size, normalize){
    var v = this.getBezierPoints(context, size, normalize);
    return bezierIntersectsRect(v[0],v[1],v[2],v[3],v[4],v[5],x1,y1,x2,y2);
  };
  getBBox(context, size, normalize){
    var v = this.getBezierPoints(context, size, normalize);
    return getBBFromPoints(v);
  };
  dist2(x,y, context, size, normalize){
    var v = this.getBezierPoints(context, size, normalize);
    return distance2ToBezier(x,y,v[0],v[1],v[2],v[3],v[4],v[5]);
  };
}


function sortByDistances(e1, e2){
  return e1.dist2 - e2.dist2;
}


class spatialIndex{
  constructor(c, nodes, lines, curves, circles, normalize){
    var size = 1;
    
    this.normalize = normalize;
    
    //tree initialization
    this.rbushtree = rbush();

    this.types = {nodes: [], lines: [], circles: [], curves: []};

    var i,j;
    var d = [];
    
    d.length = nodes.length;
    for(i = 0;i < nodes.length; i++){
      var e = new Node(nodes[i]);
      d[i] = e.getBBox(c, size);
      this.types.nodes.push(e);
      d[i].push(e);
    }

    d.length += lines.length;
    for(j = 0;j < lines.length;i++, j++){
      var e = new Line(lines[j]);
      d[i] = e.getBBox(c, size);
      this.types.lines.push(e);
      d[i].push(e);
    }

    d.length += circles.length;
    for(j = 0;j < circles.length;i++, j++){
      var e = new Circle(circles[j]);
      d[i] = e.getBBox(c, size);
      this.types.circles.push(e);
      d[i].push(e);
    }
    
    d.length += curves.length;
    for(j = 0;j < curves.length;i++, j++){
      var e = new Curve(curves[j]);
      d[i] = e.getBBox(c, size, normalize);
      this.types.curves.push(e);
      d[i].push(e);
    }

    this.rbushtree.load(d);
    
  }
  findArea(context,x1,y1,x2,y2,size,nodes,edges){
    if(x1 > x2){
      var p = x1;
      x1 = x2;
      x2 = p;
    }
    if(y1 > y2){
      var p = y1;
      y1 = y2;
      y2 = p;
    }

    
    var ret = {};
    if(edges)
      ret.edges = [];
    if(nodes)
      ret.nodes = [];

    if(ret.nodes){
      ret.nodes.sort(sortByDistances);
    }
    if(ret.edges){
      ret.edges.sort(sortByDistances);
    }
    
    var x = (x1+x2)/2;
    var y = (y1+y2)/2;

    var data = this.rbushtree.search([x1-EPS, y1-EPS, x2+EPS,  y2+EPS]);
    
    for(var i = 0; i < data.length; i++){
      var e = data[i][4];

      var dist2 = e.dist2(x,y, context, size, this.normalize);

      if(!e.intersectsRect(x1,y1,x2,y2,context, size, this.normalize))
        continue;

      if(e.isNode && nodes){
        ret.nodes.push({node:e.e, dist: Math.sqrt(dist2), dist2: dist2});
      }
      if(e.isEdge && edges){
        ret.edges.push({edge:e.e, dist: Math.sqrt(dist2), dist2: dist2});
      }
    }
    
    
    return ret;    
  }
  find(context, x,y, radius, size, nodes, edges){
    var ret = {};
    if(edges)
      ret.edges = [];
    if(nodes)
      ret.nodes = [];

    var xradius = radius;
    var yradius = radius;

    var radius2 = radius*radius;

    var data = this.rbushtree.search([x - xradius, y - yradius, x + xradius,  y + yradius]);

    for(var i = 0; i < data.length; i++){
      var e = data[i][4];
      var dist2 = e.dist2(x,y, context, size, this.normalize);
      if(dist2 > radius2)
        continue;

      if(e.isNode && nodes){
        ret.nodes.push({node:e.e, dist: Math.sqrt(dist2), dist2: dist2});
      }
      if(e.isEdge && edges){
        ret.edges.push({edge:e.e, dist: Math.sqrt(dist2), dist2: dist2});
      }
    }

    if(ret.nodes){
      ret.nodes.sort(sortByDistances);
    }
    if(ret.edges){
      ret.edges.sort(sortByDistances);
    }

    return ret;
  }
  update(context, size, t, i, v){
    var tConst = {nodes: Node, lines: Line, circles: Circle, curves: Curve};
    this.rbushtree.remove(this.types[t][i]);

    var e = new tConst[t](v);
    var arr = e.getBBox(context, size, this.normalize);
    arr.push(e);

    this.rbushtree.insert(this.types[t][i] = arr);
  }
}

module.exports = spatialIndex;

});