/* TECHMINES contact handset, drawn in 3D.
   phone.js runs the physics and placement; this file only draws: a glossy black handset with
   perforated ear and mouth grilles, a rubber cord sleeve, a coiled cord built as a real helix,
   and the rail and carriage it hangs from, lit by soft studio lights with a red bounce from the
   section and casting a soft shadow onto it. Needs three.js (r128, global THREE). */
(function () {
  'use strict';

  window.TMPhone3D = function (host) {
    var THREE = window.THREE;
    if (!THREE) return null;
    var canvas = document.createElement('canvas');
    canvas.className = 'phone-gl';
    canvas.setAttribute('aria-hidden', 'true');
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { return null; }
    if (!renderer.getContext()) return null;
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(canvas);

    var scene = new THREE.Scene();
    var cam = new THREE.OrthographicCamera(0, 100, 0, -100, 1, 3000);
    cam.position.set(0, 0, 1000);

    // ---------------------------------------------------------------- light and reflections
    // A small photo studio rendered into an environment map: a big softbox above, a strip on the
    // left, and red bounce from the section around it, so the black plastic reads as glossy.
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide })));
    function panel(w, h, hex, k, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    panel(6, 1.6, 0xffffff, 4.2, 0, 5.4, 2.2);
    panel(0.9, 5, 0xffffff, 2.2, -5.6, 0.8, 2.6);
    panel(0.8, 5, 0xff2a2a, 1.4, 5.6, 0, 1.8);
    panel(10, 3, 0xff1010, 0.35, 0, -1.5, -5.6);
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.02).texture;
    pmrem.dispose();

    var key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 4;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.6;
    scene.add(key); scene.add(key.target);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a0000, 0.12));
    var KEY_DIR = new THREE.Vector3(-0.3, 0.5, 0.81).normalize();

    var shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.28 }));
    shadowPlane.position.z = -24;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ---------------------------------------------------------------- materials
    var gloss = new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.42, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.85 });
    var satin = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0b, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.7 });
    var rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85 });
    var steel = new THREE.MeshStandardMaterial({ color: 0xb4b4ba, roughness: 0.26, metalness: 1 });
    var gunmetal = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.3, metalness: 0.9, envMapIntensity: 0.8 });
    var cordMat = new THREE.MeshPhysicalMaterial({ color: 0x040404, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.8 });

    // Grille faces drawn on a canvas: perforations with a lit lower lip, so they read as holes
    function grille(rings) {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var g = c.getContext('2d');
      var bg = g.createRadialGradient(118, 110, 10, 128, 128, 128);
      bg.addColorStop(0, '#26262a'); bg.addColorStop(0.7, '#161618'); bg.addColorStop(1, '#0c0c0d');
      g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
      var hole = function (x, y, r) {
        g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.arc(x + 0.8, y + 1.2, r, 0, 7); g.fill();
        g.fillStyle = '#030303'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      };
      if (rings) {
        hole(128, 128, 7);
        [[6, 30, 5.5], [12, 56, 5], [18, 82, 4.6]].forEach(function (rg) {
          for (var i = 0; i < rg[0]; i++) { var a = i / rg[0] * Math.PI * 2 + rg[0] * 0.1; hole(128 + Math.cos(a) * rg[1], 128 + Math.sin(a) * rg[1], rg[2]); }
        });
      } else {
        for (var y = -5; y <= 5; y++) for (var x = -5; x <= 5; x++) {
          var px = 128 + (x + (y % 2 ? 0.5 : 0)) * 17, py = 128 + y * 15;
          if (Math.hypot(px - 128, py - 128) < 84) hole(px, py, 4.4);
        }
      }
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke();
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    }

    // The wordmark pressed into the side of the handle
    function wordmark() {
      var c = document.createElement('canvas'); c.width = 512; c.height = 64;
      var g = c.getContext('2d');
      g.font = '600 34px "Chakra Petch", "Arial Narrow", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (g.letterSpacing !== undefined) g.letterSpacing = '9px';
      g.fillStyle = 'rgba(0,0,0,.85)'; g.fillText('TECHMINES', 256, 34);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillText('TECHMINES', 256, 31);
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
    }

    // ---------------------------------------------------------------- the handset (y up, cups face +x)
    var model = new THREE.Group();
    var handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(15, 86, 0), new THREE.Vector3(5, 75, 0), new THREE.Vector3(-0.5, 50, 0), new THREE.Vector3(-2, 0, 0),
      new THREE.Vector3(-0.5, -50, 0), new THREE.Vector3(5, -75, 0), new THREE.Vector3(15, -86, 0)
    ]);
    var handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 80, 9.4, 28, false), gloss);
    handle.scale.z = 0.78;
    model.add(handle);

    var cupProfile = [[10, 0], [13.5, 2.6], [17.6, 5.6], [20.6, 9], [22.4, 13], [23.2, 17], [23.4, 21], [23.1, 23.6], [22.2, 25.4], [20.8, 26.4], [19.6, 26.7]]
      .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var cupGeo = new THREE.LatheGeometry(cupProfile, 64);
    cupGeo.rotateZ(-Math.PI / 2);                      // its axis now points along +x
    var earMat = grille(false), mouthMat = grille(true);
    var lipGeo = new THREE.TorusGeometry(20.2, 0.9, 12, 64); lipGeo.rotateY(Math.PI / 2);
    var faceGeo = new THREE.CircleGeometry(19.8, 64); faceGeo.rotateY(Math.PI / 2);
    var EAR = { at: null, axis: null };
    function cup(y, tilt, faceMat, isEar) {
      var g = new THREE.Group();
      g.position.set(10, y, 0); g.rotation.z = tilt;
      g.add(new THREE.Mesh(cupGeo, gloss));
      var lip = new THREE.Mesh(lipGeo, satin); lip.position.x = 26.3; g.add(lip);
      var face = new THREE.Mesh(faceGeo, faceMat); face.position.x = 26.1; g.add(face);
      if (isEar) { EAR.at = new THREE.Object3D(); EAR.at.position.x = 30; g.add(EAR.at); EAR.tip = new THREE.Object3D(); EAR.tip.position.x = 60; g.add(EAR.tip); }
      model.add(g);
    }
    cup(90, -0.17, mouthMat, false);    // mouthpiece at the top (the cord end)
    cup(-90, 0.17, earMat, true);       // earpiece at the bottom

    // rubber sleeve where the cord leaves the mouthpiece
    var boot = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.6, 16, 20), rubber);
    boot.position.set(12, 104, 0); model.add(boot);
    [99, 102.6, 106.2].forEach(function (y) {
      var r = new THREE.Mesh(new THREE.TorusGeometry(4.5 - (y - 96) * 0.13, 0.5, 8, 24), rubber);
      r.rotation.x = Math.PI / 2; r.position.set(12, y, 0); model.add(r);
    });

    var word = wordmark();
    var w1 = new THREE.Mesh(new THREE.PlaneGeometry(68, 8.5), word); w1.rotation.z = Math.PI / 2; w1.position.set(-1.6, 0, 7.4); model.add(w1);
    var w2 = new THREE.Mesh(new THREE.PlaneGeometry(68, 8.5), word); w2.rotation.set(0, Math.PI, -Math.PI / 2); w2.position.set(-1.6, 0, -7.4); model.add(w2);

    model.traverse(function (o) { if (o.isMesh && o.material !== word) o.castShadow = true; });

    // attach point (where the cord meets the sleeve) at the origin
    var ATTACH = new THREE.Vector3(12, 112, 0), COM = new THREE.Vector3(9, 0, 0);
    model.position.set(-ATTACH.x, -ATTACH.y, 0);
    var yawG = new THREE.Group(); yawG.add(model);
    var pivot = new THREE.Group(); pivot.add(yawG);
    scene.add(pivot);

    // ---------------------------------------------------------------- rail and carriage
    var railGeo = new THREE.CylinderGeometry(1.9, 1.9, 1, 16); railGeo.rotateZ(Math.PI / 2);
    var rail = new THREE.Mesh(railGeo, gunmetal); rail.castShadow = true; scene.add(rail);
    var stopGeo = new THREE.BoxGeometry(5, 13, 9);
    var stopA = new THREE.Mesh(stopGeo, satin), stopB = new THREE.Mesh(stopGeo, satin);
    stopA.castShadow = stopB.castShadow = true; scene.add(stopA); scene.add(stopB);

    var car = new THREE.Group();
    (function () {
      var w = 50, h = 15, r = 3.4, s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      var plate = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 4, curveSegments: 10 }), satin);
      plate.position.set(0, 9.5, -4); car.add(plate);
      [-17, 17].forEach(function (x, i) {
        var sc = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 1.8, 24), steel);
        sc.rotation.x = Math.PI / 2; sc.position.set(x, 9.5, 6.4); car.add(sc);
        var slot = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 0.6), gunmetal);
        slot.position.set(x, 9.5, 7.4); slot.rotation.z = i ? -0.6 : 0.7; car.add(slot);
      });
      var neck = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 8, 16), rubber); neck.position.set(0, -1, 0); car.add(neck);
      var grom = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.9, 10, 24), steel); grom.rotation.x = Math.PI / 2; grom.position.set(0, 2.6, 0); car.add(grom);
    })();
    car.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    scene.add(car);

    // ---------------------------------------------------------------- the coiled cord (rebuilt every frame)
    var MAXP = 420, RAD = 6;
    var cordGeo = new THREE.BufferGeometry();
    var pos = new Float32Array(MAXP * RAD * 3), nor = new Float32Array(MAXP * RAD * 3), idx = [];
    for (var i = 0; i < MAXP - 1; i++) for (var j = 0; j < RAD; j++) {
      var a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = a + RAD, d = b + RAD;
      idx.push(a, c, b, b, c, d);
    }
    cordGeo.setIndex(idx);
    cordGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    cordGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    var cord = new THREE.Mesh(cordGeo, cordMat);
    cord.frustumCulled = false; cord.castShadow = true;
    scene.add(cord);
    var P = [], T = new THREE.Vector3(), Nn = new THREE.Vector3(0, 0, 1), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    for (var q = 0; q < MAXP; q++) P.push(new THREE.Vector3());

    function buildCord(pts, top, S) {
      var n = pts.length, links = n - 2, per = Math.max(6, Math.min(18, Math.floor((MAXP - 2) / links)));
      var loops = 1.55, R = 4.4 * S, r = 1.32 * S, m = 0;
      for (var i = 0; i < links; i++) {
        var a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, tx = dx / len, ty = dy / len;
        for (var k = 0; k < per; k++) {
          var u = k / per, g = i + u, ph = g * loops * Math.PI * 2;
          var taper = Math.max(0, Math.min(1, g / 0.7, (links - g) / 0.5)), rr = R * taper;
          // a true helix around the cord's line: one part in the page, one part toward you
          var x = a.x + dx * u - ty * Math.sin(ph) * rr, y = a.y + dy * u + tx * Math.sin(ph) * rr, z = Math.cos(ph) * rr;
          P[m++].set(x, -y, z);
        }
      }
      P[m++].set(top.x, -top.y, 0);
      // parallel-transport frames give a tube with no twisting seams
      Nn.set(0, 0, 1);
      for (var p = 0; p < m; p++) {
        var prev = P[Math.max(0, p - 1)], next = P[Math.min(m - 1, p + 1)];
        T.subVectors(next, prev).normalize();
        Nn.sub(tmp.copy(T).multiplyScalar(Nn.dot(T)));
        if (Nn.lengthSq() < 1e-6) Nn.set(T.y, -T.x, 0);
        Nn.normalize(); B.crossVectors(T, Nn);
        for (var j = 0; j < RAD; j++) {
          var ang = j / RAD * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
          var nx = Nn.x * cs + B.x * sn, ny = Nn.y * cs + B.y * sn, nz = Nn.z * cs + B.z * sn, o = (p * RAD + j) * 3;
          nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
          pos[o] = P[p].x + nx * r; pos[o + 1] = P[p].y + ny * r; pos[o + 2] = P[p].z + nz * r;
        }
      }
      cordGeo.setDrawRange(0, (m - 1) * RAD * 6);
      cordGeo.attributes.position.needsUpdate = true;
      cordGeo.attributes.normal.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per-frame drawing
    var W = 0, H = 0, ear = new THREE.Vector3(), tip = new THREE.Vector3();
    function resize(w, h) {
      if (w === W && h === H) return;
      W = w; H = h;
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      cam.left = 0; cam.right = w; cam.top = 0; cam.bottom = -h; cam.updateProjectionMatrix();
      shadowPlane.scale.set(w * 1.4, h * 1.4, 1); shadowPlane.position.set(w / 2, -h / 2, -24);
      key.target.position.set(w / 2, -h / 2, 0);
      key.position.copy(key.target.position).addScaledVector(KEY_DIR, 1200);
      key.shadow.camera.near = 10; key.shadow.camera.far = 2600;
    }

    // f: -1 faces left, +1 faces right; in between it turns toward you
    function yawFor(f) { return -Math.PI / 2 + f * (Math.PI / 2 - 0.55); }

    return {
      canvas: canvas,
      attach: { x: ATTACH.x, y: ATTACH.y },
      draw: function (st) {
        resize(st.W, st.H);
        var yaw = yawFor(st.face);
        // screen angle of the attach-to-weight line, once the turn is taken into account
        var vx = (COM.x - ATTACH.x) * Math.cos(yaw), vy = ATTACH.y - COM.y;
        var rot = st.segA - Math.atan2(vy, vx) + st.shake * 0.09;
        pivot.position.set(st.top.x + st.shake * 1.2, -st.top.y, 0);
        pivot.rotation.z = -rot;
        pivot.scale.setScalar(st.S);
        yawG.rotation.y = yaw;
        car.position.set(st.carX, -(st.carY + 5), 0); car.scale.setScalar(st.S);
        var len = Math.max(10, st.railB - st.railA), ry = -(st.carY - 12);
        rail.scale.x = len; rail.position.set((st.railA + st.railB) / 2, ry, -2);
        stopA.position.set(st.railA - 2, ry, -2); stopB.position.set(st.railB + 2, ry, -2);
        buildCord(st.pts, st.top, st.S);
        // keep the shadow map tight around the handset so its shadow stays crisp
        var cx = (st.railA + st.railB) / 2, half = Math.max(260 * st.S, (st.railB - st.railA) / 2 + 140 * st.S, st.H * 0.6);
        key.target.position.set(cx, -st.H / 2, 0); key.position.copy(key.target.position).addScaledVector(KEY_DIR, 1200);
        var sc = key.shadow.camera;
        if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
        renderer.render(scene, cam);
        // where the earpiece is, so the page can draw the ring marks beside it
        pivot.updateMatrixWorld(true);
        EAR.at.getWorldPosition(ear); EAR.tip.getWorldPosition(tip);
        return { x: ear.x, y: -ear.y, dx: tip.x - ear.x, dy: -(tip.y - ear.y) };
      },
      dispose: function () { renderer.dispose(); canvas.remove(); }
    };
  };
})();
