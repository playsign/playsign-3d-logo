"use strict";
var LogoApp = LogoApp || {};

/* todo
 * - fallback to image logo
 * - only after initial draw, only render when animating or after resize 
 * - check 30 fps
 * - finish postprocessing
*/


LogoApp.logoAssetUrl = "Logo10-mat_tex.json";

LogoApp.init = function() {
    var container = document.createElement("div");
    this.prevUpdateMillis = Date.now();
    document.body.appendChild(container);
    var r;
    var opts = {antialias: true};
    this.scene = new THREE.Scene;
    try {
        this.renderer = r = new THREE.WebGLRenderer(opts);
    } catch (e) {
        return false;
    }
    r.setPixelRatio(window.devicePixelRatio || 1);
    this.logoInitialRotationY = -Math.PI/1.85;
    this.maximumWidth = 500;
    this.renderWidth = 258; this.renderHeight = 185;   
    this.scalingUp = this.scalingDown = false;
    //this.scalingUp = true;
    this.minimumWidth = this.renderWidth;
    r.setSize(this.renderWidth, this.renderHeight);
    // r.setClearColor( scene.fog.color );
    container.appendChild(r.domElement);
    console.log("init fini");

    this.turnsPerSec = .025;
    this.animRotationMatrix = new THREE.Matrix4();
    //this.logoParent = new THREE.Object3D;
    //this.logoParent.position.set(200, 0, 0);
    
    this.detectedPixelRatio = window.devicePixelRatio || 1;
    this.setupCameraAndLights();
    //this.setupPostprocessing();
    this.setupAssets();

    return true;
};

LogoApp.setupCameraAndLights = function() {
    this.camera = new THREE.PerspectiveCamera(25, this.renderWidth / this.renderHeight, 1, 26.5);

    
    this.camera.position.y = 1;
//    this.camera.position.y = 11;
    this.camera.position.x = -31;
    this.camera.lookAt(new THREE.Vector3(20, 0, 0));

    var thisIsThis = this;
    // var cameraPos = { x: -31, y: 1, z: 0 };
    // var cameraEndPos = { x: -21, y: 11, z: 0 };
    // this.cameraPosTween = new TWEEN.Tween(
    //     cameraPos).to(cameraEndPos, 2000);
    // this.cameraPosTween.onUpdate(function() {
    //     thisIsThis.camera.position.x = cameraPos.x;
    // });
    
    this.scene.add(new THREE.AmbientLight(0xffffff));
    var dLight = new THREE.DirectionalLight(0xffffff);
    dLight.position.set(0, 1, 0);
    this.scene.add(dLight);
};

LogoApp.setupAssets = function() {
    var thisIsThis = this;

    var loader = new THREE.ObjectLoader;
    var logoLoadedCallback = function(loadedScene) {
        thisIsThis.loadedParent = new THREE.Group;
        var objectsToAdd = [];
        loadedScene.traverse(function(obj) {
            console.log("mesh " + obj.id + " found in loaded sene, name: " + obj.name);
            
            // scene .add method has a side effect of reaching a
            // tentacle up to old scene, and removing the object from the
            // source scene. So you can't add() objects between scenes
            // while iterating over the objects since .children will
            // get mutated from under you.
            objectsToAdd.push(obj);
        });
        thisIsThis.loadedParent.rotation.y = thisIsThis.logoInitialRotationY;
        objectsToAdd.map(function(o) { thisIsThis.loadedParent.add(o) });
        thisIsThis.scene.add(thisIsThis.loadedParent);
        thisIsThis.prevUpdateMillis = Date.now();
        thisIsThis.animate();
    };
    loader.load(this.logoAssetUrl, logoLoadedCallback);
};

LogoApp.setupPostprocessing = function() {
    var renderModel = new THREE.RenderPass(this.scene, this.camera);
    // var effectBloom = new THREE.BloomPass( 1.3 );
    var effectCopy = new THREE.ShaderPass( THREE.CopyShader );

    this.effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );

    this.effectFXAA.uniforms[ 'resolution' ].value.set(1 / this.renderWidth, 1 / this.renderHeight);

    effectCopy.renderToScreen = true;

    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.addPass(renderModel);
    this.composer.addPass(this.effectFXAA);
    //this.composer.addPass(effectBloom);
    this.composer.addPass(effectCopy);
};

LogoApp.animate = function(oneShot) {

    if (this.renderWidth < this.maximumWidth && this.scalingUp)
       this.resize(this.renderWidth + 2, this.renderHeight + 1);
    else if (this.renderWidth > this.minimumWidth && this.scalingDown)
       this.resize(this.renderWidth - 2, this.renderHeight - 1);

    // XXX why compute turn increment for this frame, instead of computing
    // correct rotation for this time offset since beginning
    var nowMillis = Date.now();
    var frametimeSeconds = (nowMillis - this.prevUpdateMillis) / 1000.0;
    var turnsPerCurrentFrame = this.turnsPerSec * frametimeSeconds;
    this.prevUpdateMillis = nowMillis;
    
    //this.animRotationMatrix.makeRotationZ(Math.PI*2*turnsPerCurrentFrame);
    //this.cubeMesh.rotation.x += Math.PI*2*turnsPerCurrentFrame;
    this.animRotationMatrix.makeRotationZ(Math.PI*2*turnsPerCurrentFrame);
    if (this.loadedParent)
        this.loadedParent.rotation.y += Math.PI*2*turnsPerCurrentFrame;
    var thisIsThis = this;
    if (this.scalingUp || this.scalingDown || oneShot) {
        requestAnimationFrame(function() { thisIsThis.animate(); });
    }
    var renderStart = performance.now();
    if (this.composer) {
        this.renderer.clear();
        this.composer.render();
    } else {
        this.renderer.render(this.scene, this.camera);
    }
    var renderElapsed = performance.now() - renderStart;
    console.log("render took " + renderElapsed);
};

LogoApp.resize = function(width, height) {
    this.renderWidth = width;
    this.renderHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);    
    if (this.composer) {
        this.effectFXAA.uniforms['resolution'].value.set(1/width, 1/height);
        this.composer.reset();
    }
};

if (LogoApp.init() == true) {
    // LogoApp.animate();
    42;
} else
    console.log("webgl logo init failed");

window.setTimeout(function() {LogoApp.scalingUp = true; LogoApp.animate();}, 5000);
