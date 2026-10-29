/**
 * autumn-leaves.js
 * Cinematic Global Falling Autumn Leaves & Golden Sparkles Engine
 * Handcrafted for indexGin's Space (2026)
 */
(function () {
  'use strict';

  var canvas = document.getElementById('web_leaves_canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var width = 0;
  var height = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var leaves = [];
  var sparkles = [];
  var leafCount = 42;
  var sparkleCount = 18;
  var isTabActive = true;
  var animFrameId = null;

  // Autumn color palette matching the canopy image
  var leafColors = [
    { fill: 'rgba(234, 88, 12, 0.88)', vein: 'rgba(255, 237, 213, 0.45)' },   // Rust orange
    { fill: 'rgba(249, 115, 22, 0.88)', vein: 'rgba(255, 255, 255, 0.50)' },   // Vibrant amber orange
    { fill: 'rgba(251, 146, 60, 0.85)', vein: 'rgba(255, 255, 255, 0.45)' },   // Apricot gold
    { fill: 'rgba(194, 65, 12, 0.90)', vein: 'rgba(254, 215, 170, 0.40)' },   // Deep maple red-brown
    { fill: 'rgba(217, 119, 6, 0.85)', vein: 'rgba(255, 255, 255, 0.45)' }     // Golden oak
  ];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
  }

  function createLeaf(initial) {
    var colorObj = leafColors[Math.floor(Math.random() * leafColors.length)];
    return {
      x: Math.random() * width,
      y: initial ? Math.random() * height : -30 - Math.random() * 40,
      size: Math.random() * 9 + 8, // 8px to 17px
      speedY: Math.random() * 1.1 + 0.65, // downward speed
      windX: Math.random() * 0.4 - 0.15, // constant gentle wind
      sway: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.025 + 0.015,
      swayRadius: Math.random() * 1.2 + 0.6,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.022,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: Math.random() * 0.035 + 0.018,
      opacity: Math.random() * 0.35 + 0.65,
      color: colorObj.fill,
      vein: colorObj.vein
    };
  }

  function createSparkle(initial) {
    return {
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 10,
      size: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.45 + 0.2), // slow upward float
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.3,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.02
    };
  }

  function init() {
    resize();
    leaves = [];
    sparkles = [];
    for (var i = 0; i < leafCount; i++) {
      leaves.push(createLeaf(true));
    }
    for (var j = 0; j < sparkleCount; j++) {
      sparkles.push(createSparkle(true));
    }
  }

  function drawLeaf(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(Math.cos(p.flip), 1); // 3D tumble flip
    ctx.globalAlpha = p.opacity;

    var s = p.size;

    // Organic autumn leaf blade
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.85, -s * 0.2, s * 0.55, s * 0.65);
    ctx.quadraticCurveTo(s * 0.15, s * 1.1, 0, s * 1.25); // stem tip
    ctx.quadraticCurveTo(-s * 0.15, s * 1.1, -s * 0.55, s * 0.65);
    ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();

    // Central leaf vein
    ctx.strokeStyle = p.vein;
    ctx.lineWidth = Math.max(0.65, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.75);
    ctx.lineTo(0, s * 0.95);
    ctx.stroke();

    ctx.restore();
  }

  function drawSparkle(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    var currentOpacity = Math.max(0.1, s.opacity * (0.6 + 0.4 * Math.sin(s.pulse)));
    ctx.globalAlpha = currentOpacity;

    var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size * 3);
    grad.addColorStop(0, 'rgba(254, 215, 170, 0.95)');
    grad.addColorStop(0.4, 'rgba(251, 146, 60, 0.45)');
    grad.addColorStop(1, 'rgba(251, 146, 60, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, s.size * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function step() {
    if (!isTabActive) {
      animFrameId = requestAnimationFrame(step);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Draw & update sparkles
    for (var j = 0; j < sparkles.length; j++) {
      var s = sparkles[j];
      s.pulse += s.pulseSpeed;
      s.x += s.speedX + Math.sin(s.pulse) * 0.35;
      s.y += s.speedY;

      if (s.y < -20 || s.x < -20 || s.x > width + 20) {
        sparkles[j] = createSparkle(false);
      } else {
        drawSparkle(s);
      }
    }

    // 2. Draw & update leaves
    for (var i = 0; i < leaves.length; i++) {
      var p = leaves[i];
      p.sway += p.swaySpeed;
      p.flip += p.flipSpeed;
      p.angle += p.angularSpeed;
      p.x += p.windX + Math.sin(p.sway) * p.swayRadius;
      p.y += p.speedY;

      if (p.y > height + 40 || p.x < -40 || p.x > width + 40) {
        leaves[i] = createLeaf(false);
      } else {
        drawLeaf(p);
      }
    }

    animFrameId = requestAnimationFrame(step);
  }

  // Handle visibility changes to conserve battery when tab is backgrounded
  document.addEventListener('visibilitychange', function () {
    isTabActive = !document.hidden;
  });

  var resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      resize();
    }, 150);
  }, { passive: true });

  init();
  step();
})();
