// Frame intervals are not GPU timings. The readout includes actual renderer.info
// counters when running in a browser; automatic quality only lowers pixel ratio.
export class RenderQuality {
  constructor(renderer,{deviceRatio=()=>window.devicePixelRatio||1,touch=false}={}) {
    this.renderer=renderer; this.deviceRatio=deviceRatio; this.touch=touch;
    this.mode='auto'; this.samples=new Float64Array(90);
    this.setMode('auto');
  }
  setMode(mode) {
    this.mode=['auto','low','high'].includes(mode)?mode:'auto';
    const cap=this.mode==='low'?1:this.mode==='high'?2:this.touch?1.25:1.5;
    this.ratio=Math.min(this.deviceRatio(),cap);
    this.renderer.setPixelRatio(this.ratio);
    this.sampleCount=0; this.sampleIndex=0; this.total=0; this.sinceAdjustment=0; this.mean=0;
  }
  setTouch(touch) { this.touch=touch; if(this.mode==='auto')this.setMode('auto'); }
  record(seconds,active) {
    if(!active||seconds<0.001||seconds>0.25)return;
    if(this.sampleCount===90)this.total-=this.samples[this.sampleIndex];
    else this.sampleCount++;
    this.samples[this.sampleIndex]=seconds;
    this.total+=seconds; this.sampleIndex=(this.sampleIndex+1)%90;
    this.mean=this.total/this.sampleCount;
    this.sinceAdjustment+=seconds;
    if(this.mode==='auto'&&this.sampleCount===90&&this.sinceAdjustment>4&&this.mean>0.022&&this.ratio>0.75) {
      this.ratio=Math.max(0.75,this.ratio-0.25);
      this.renderer.setPixelRatio(this.ratio);
      this.sampleCount=0; this.sampleIndex=0; this.total=0; this.sinceAdjustment=0;
    }
  }
  readout() {
    const render=this.renderer.info.render, memory=this.renderer.info.memory;
    return `${this.mean?Math.round(1/this.mean):'--'} FPS · ${(this.mean*1000).toFixed(1)} ms/frame · ${render.calls} draws · ${render.triangles} tris · ${memory.geometries} geom · ${memory.textures} tex · ${this.ratio.toFixed(2)}×`;
  }
}
