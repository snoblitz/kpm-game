// Browser chrome and keyboards can change the visible viewport without a window
// resize. Do not fit the UI to a pinched viewport: that would undo menu magnification.
export function measureViewport(win) {
  const visual=win.visualViewport;
  const unzoomed=visual && Math.abs((visual.scale || 1)-1)<0.01;
  return {
    width:Math.max(1,Math.round(unzoomed?visual.width:win.innerWidth)),
    height:Math.max(1,Math.round(unzoomed?visual.height:win.innerHeight)),
    left:unzoomed?visual.offsetLeft || 0:0,
    top:unzoomed?visual.offsetTop || 0:0
  };
}

export class GameViewport {
  constructor(root,onResize,{win=window,doc=document}={}) {
    Object.assign(this,{root,onResize,win,doc});
    this.frame=null; this.size=null;
    this.schedule=()=>{
      if(this.frame===null)this.frame=win.requestAnimationFrame(()=>{this.frame=null;this.refresh();});
    };
    this.events=[[win,'resize'],[win,'orientationchange'],[doc,'fullscreenchange'],[doc,'webkitfullscreenchange']];
    if(win.visualViewport)this.events.push([win.visualViewport,'resize'],[win.visualViewport,'scroll']);
    this.events.forEach(([target,type])=>target.addEventListener(type,this.schedule));
    this.refresh();
  }
  refresh() {
    const next=measureViewport(this.win);
    const changed=!this.size || next.width!==this.size.width || next.height!==this.size.height;
    for(const key of ['width','height','left','top']) {
      if(!this.size || next[key]!==this.size[key])this.root.style.setProperty('--view-'+key,next[key]+'px');
    }
    this.size=next;
    if(changed)this.onResize(next);
  }
  dispose() {
    this.events.forEach(([target,type])=>target.removeEventListener(type,this.schedule));
    if(this.frame!==null)this.win.cancelAnimationFrame(this.frame);
  }
}
