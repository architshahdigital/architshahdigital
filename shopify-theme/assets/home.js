/* ============================================================
   Verdant — home page motion (WebGL tea garden + brewing sequence)
   Ported from the static build. Each block no-ops when its section
   is absent, so this file is safe to load on every template.
   ============================================================ */
(function(){
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  if(!document.getElementById("garden") && !document.getElementById("brewRail")) return;

  /* ---------------- WebGL: misty terraced tea hills ---------------- */
    (function(){
      var cv = document.getElementById("garden");
      var gl = cv.getContext("webgl", {antialias:false, alpha:false});
      if(!gl){ cv.style.background="linear-gradient(#cfe0d0,#2F5D45)"; return; }

      var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
      var FS = [
        "precision highp float;",
        "uniform vec2 u_res; uniform float u_t; uniform float u_dark; uniform float u_scr;",
        "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
        "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
        " return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
        "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}",
        "void main(){",
        " vec2 uv=gl_FragCoord.xy/u_res.xy;",
        " float ar=u_res.x/u_res.y;",
        " float t=u_t*.02;",
        " vec3 skyTop=mix(vec3(.780,.836,.800),vec3(.043,.098,.078),u_dark);",
        " vec3 skyLow=mix(vec3(.953,.929,.871),vec3(.098,.184,.141),u_dark);",
        " vec3 col=mix(skyLow,skyTop,smoothstep(.40,1.,uv.y));",
        " vec2 sp=vec2(.66,.80); float sd=length((uv-sp)*vec2(ar,1.));",
        " col+=mix(vec3(.98,.90,.70),vec3(.50,.42,.22),u_dark)*smoothstep(.34,.0,sd)*.5;",
        " for(int i=0;i<6;i++){",
        "  float fi=float(i);",
        "  float base=.635-fi*.083;",
        "  float amp=.020+fi*.011;",
        "  float freq=1.15+fi*.62;",
        "  float drift=t*(.25+fi*.16);",
        "  float ry=base+amp*(fbm(vec2(uv.x*ar*freq+drift+fi*7.3,fi*3.1))-.5)*2.2;",
        "  if(uv.y<ry){",
        "   float far=1.-fi/5.;",
        "   vec3 hill=mix(vec3(.176,.365,.271),vec3(.043,.110,.078),fi/5.);",
        "   hill=mix(hill,vec3(.365,.541,.404),(1.-fi/5.)*.35);",
        "   float d=ry-uv.y;",
        "   float rows=sin(d*(150.-fi*14.)+fbm(vec2(uv.x*ar*3.,d*6.))*4.0);",
        "   float rowShade=smoothstep(.1,.9,rows)*(.10+.06*(fi/5.));",
        "   hill*=1.-rowShade*step(2.5,fi);",
        "   vec3 haze=mix(vec3(.886,.894,.855),vec3(.118,.208,.161),u_dark);",
        "   hill=mix(hill,haze,far*far*.82);",
        "   col=mix(col,hill,smoothstep(0.,.006,d));",
        "  }",
        " }",
        " float m=fbm(vec2(uv.x*ar*1.6+t*1.4,uv.y*7.-t*.5));",
        " float band=smoothstep(.42,.86,m)*smoothstep(.62,.18,uv.y)*smoothstep(.02,.20,uv.y);",
        " vec3 mist=mix(vec3(.969,.961,.933),vec3(.271,.369,.322),u_dark);",
        " col=mix(col,mist,band*.62);",
        " vec3 gnd=mix(vec3(.964,.945,.906),vec3(.047,.110,.082),u_dark);",
        " col=mix(col,gnd,clamp(u_scr,0.,1.)*.85);",
        " col+=(h(gl_FragCoord.xy+u_t)-.5)*.015;",
        " gl_FragColor=vec4(col,1.);",
        "}"
      ].join("\n");

      function sh(ty,src){var s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);
        return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null;}
      var vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS);
      if(!vs||!fs) return;
      var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) return;
      gl.useProgram(pr);
      var bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      var lc=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(lc);
      gl.vertexAttribPointer(lc,2,gl.FLOAT,false,0,0);
      var uRes=gl.getUniformLocation(pr,"u_res"),uT=gl.getUniformLocation(pr,"u_t"),
          uD=gl.getUniformLocation(pr,"u_dark"),uS=gl.getUniformLocation(pr,"u_scr");
      function size(){
        var d=Math.min(window.devicePixelRatio||1,1.5);
        cv.width=Math.floor(cv.clientWidth*d);cv.height=Math.floor(cv.clientHeight*d);
        gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(uRes,cv.width,cv.height);
      }
      window.addEventListener("resize",size);size();
      var t0=performance.now();
      window.__garden=function(scr){
        gl.uniform1f(uD, getComputedStyle(root).getPropertyValue("--dark-mode").trim()==="1"?1:0);
        gl.uniform1f(uS,scr);
        gl.uniform1f(uT, reduced?20:(performance.now()-t0)/1000);
        gl.drawArrays(gl.TRIANGLES,0,3);
      };
    })();

  /* ---------------- brewing sequence ---------------- */
    var liquid=document.getElementById("liquid"), pour=document.getElementById("pour"),
        steam=document.getElementById("steam"), rail=document.getElementById("brewRail"),
        bar=document.getElementById("brewBar"), clock=document.getElementById("brewClock"),
        temp=document.getElementById("brewTemp"),
        phases=Array.prototype.slice.call(document.querySelectorAll(".brew__phase"));

    var leafEls=[];
    (function(){
      var glass=document.getElementById("glass");
      if(!glass) return;
      for(var i=0;i<9;i++){
        var l=document.createElement("i");
        l.className="cup__leaf";
        leafEls.push({el:l, x:20+(i*23)%176, rest:186+((i*13)%40), rot:(i*47)%360, ph:i/9});
        glass.appendChild(l);
      }
    })();

    function lerp(a,b,t){return a+(b-a)*t;}
    function cl(v){return v<0?0:v>1?1:v;}

    /* the brewing section is optional — merchants can remove it in the editor,
       so every entry point below is a no-op when its nodes are absent */
    function brew(p){
      if(!liquid) return;
      var pDrop=cl(p/.22), pPour=cl((p-.24)/.30), pSteep=cl((p-.56)/.26), pDone=cl((p-.84)/.16);

      liquid.style.setProperty("--fill",(pPour*.78).toFixed(3));

      var r=Math.round(lerp(lerp(232,226,pPour),186,pSteep));
      var g=Math.round(lerp(lerp(228,214,pPour),150,pSteep));
      var b=Math.round(lerp(lerp(206,152,pPour), 62,pSteep));
      liquid.style.setProperty("--liq","rgba("+r+","+g+","+b+","+(.32+pPour*.5+pSteep*.16).toFixed(2)+")");

      var pouring=(pPour>.02 && pPour<.99)?1:0;
      pour.style.setProperty("--pour",pouring?"1":"0");
      pour.style.setProperty("--pourS",pouring?"1":"0");
      steam.style.setProperty("--steam",(pSteep*.9+pDone*.1).toFixed(2));

      for(var i=0;i<leafEls.length;i++){
        var L=leafEls[i];
        var dp=cl((pDrop-L.ph*.5)/.5);
        var y=lerp(-70,L.rest,dp);
        var lift=pPour*56*(.5+(i%3)*.25);
        var sway=Math.sin((p*6+i)*1.6)*(6*pSteep);
        L.el.style.transform="translate("+(L.x+sway).toFixed(1)+"px,"+(y-lift).toFixed(1)+"px) rotate("+(L.rot+dp*160+pSteep*90).toFixed(0)+"deg)";
        L.el.style.opacity=dp.toFixed(2);
      }

      bar.style.setProperty("--bp",cl(p).toFixed(3));
      clock.textContent=Math.round(cl((p-.56)/.28)*90)+" s";
      temp.textContent=(pPour>0?Math.round(lerp(80,74,pSteep)):80)+" °C";

      var active=p<.24?0:p<.56?1:p<.84?2:3;
      for(var k=0;k<phases.length;k++) phases[k].setAttribute("data-on",k===active?"1":"0");
    }
    brew(0);

  /* ---------------- single scroll loop ---------------- */
    var plates=Array.prototype.slice.call(document.querySelectorAll(".plate")),
        pouch=document.getElementById("pouch"),
        specimen=document.querySelector(".specimen"),
        heroInner=document.querySelector(".hero__inner");
    var mx=0,my=0,tmx=0,tmy=0;
    if(!reduced && window.matchMedia("(pointer:fine)").matches){
      window.addEventListener("mousemove",function(e){
        tmx=(e.clientX/window.innerWidth-.5)*2; tmy=(e.clientY/window.innerHeight-.5)*2;
      },{passive:true});
    }

    function frame(){
      var y=window.scrollY||0, vh=window.innerHeight;
      var hp=Math.min(y/vh,1);
      if(window.__garden) window.__garden(hp);
      mx+=(tmx-mx)*.06; my+=(tmy-my)*.06;
      if(heroInner){
        heroInner.style.transform="translate3d("+(mx*-11)+"px,"+(hp*54+my*-8)+"px,0)";
        heroInner.style.opacity=String(Math.max(0,1-hp*1.35));
      }
      if(specimen){
        specimen.style.transform="translate3d("+(mx*22)+"px,"+(hp*100+my*15)+"px,0)";
        specimen.style.opacity=String(Math.max(0,1-hp*1.5));
      }
      if(rail && !reduced){
        var rr=rail.getBoundingClientRect();
        if(rr.bottom>0 && rr.top<vh){
          var p=(-rr.top)/(rr.height-vh);
          brew(p<0?0:p>1?1:p);
        }
      }
      for(var i=0;i<plates.length;i++){
        var r=plates[i].getBoundingClientRect();
        if(r.bottom>-200 && r.top<vh+200){
          plates[i].style.setProperty("--q",((vh-r.top)/(vh+r.height)).toFixed(4));
        }
      }
      if(pouch){
        var p2=pouch.getBoundingClientRect();
        if(p2.bottom>-300 && p2.top<vh+300){
          pouch.style.setProperty("--spin",(((vh-p2.top)/(vh+p2.height))*120-70).toFixed(2));
        }
      }
      requestAnimationFrame(frame);
    }

  requestAnimationFrame(frame);
})();
