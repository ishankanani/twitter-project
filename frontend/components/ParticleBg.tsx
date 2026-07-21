'use client';
import { useEffect, useRef } from 'react';

export default function ParticleBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let dots: any[] = [];
    let W = 0, H = 0, animId = 0;

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    const init = () => {
      resize();
      const count = Math.max(40, Math.floor((W * H) / 14000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        a: Math.random() * 0.3 + 0.05,
        pulse: Math.random() * Math.PI * 2,
        ps: Math.random() * 0.012 + 0.004
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy; d.pulse += d.ps;
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
        const a = d.a * (0.6 + 0.4 * Math.sin(d.pulse));
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(209,0,9,${a * 0.6})`; ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(209,0,9,${0.05 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.4; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', init);
    init(); draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, []);

  return <canvas ref={ref} id="bgc" />;
}
