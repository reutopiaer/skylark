/**
 * skylark - An Elegant JavaScript Library and HTML5 Application Framework.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
define(["skylark/skylark","skylark/langx","skylark/noder","skylark/datax","skylark/geom","skylark/eventer","skylark/styler"],function(e,t,n,o,r,a,s){function i(e,t){function o(e){var t,n;if(e.changedTouches)for(t="screenX screenY pageX pageY clientX clientY".split(" "),n=0;n<t.length;n++)e[t[n]]=e.changedTouches[0][t[n]]}t=t||{};var i,u,c,l,m,d,f,v,h=t.handle||e,p=t.constraints,k=t.document||document,g=t.started,y=t.moving,X=t.stopped,c=function(t){var c,p=r.getDocumentSize(k);o(t),t.preventDefault(),u=t.button,m=t.screenX,d=t.screenY,f=r.relativePosition(e),v=r.size(e),c=s.css(h,"curosr"),i=n.createElement("div"),s.css(i,{position:"absolute",top:0,left:0,width:p.width,height:p.height,zIndex:2147483647,opacity:1e-4,cursor:c}),n.append(k.body,i),a.on(k,"mousemove touchmove",Y).on(k,"mouseup touchend",l),g&&g(t)},Y=function(t){if(o(t),0!==t.button)return l(t);t.deltaX=t.screenX-m,t.deltaY=t.screenY-d;var n=f.left+t.deltaX,a=f.top+t.deltaY;p&&(n<p.minX&&(n=p.minX),n>p.maxX&&(n=p.maxX),a<p.minY&&(a=p.minY),a>p.maxY&&(a=p.maxY)),r.relativePosition(e,{left:n,top:a}),t.preventDefault(),y&&y(t)},l=function(e){o(e),a.off(k,"mousemove touchmove",Y).off(k,"mouseup touchend",l),n.remove(i),X&&X(e)};return a.on(h,"mousedown touchstart",c),{remove:function(){a.off(h)}}}function u(){return u}a.on,a.off,o.attr,o.removeAttr,r.pagePosition,s.addClass,r.height;return t.mixin(u,{movable:i}),e.mover=u});