// The HUD: big readable numbers a judge can read at a glance — altitude,
// speed, heading on a compass strip, fuel and damage bars, ring count and
// score — plus a lit instrument panel (artificial horizon, altimeter, throttle)
// drawn on a small canvas, and the title / pause / end overlays.
import { MISSION } from './config.js';

const HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function compassLabel(degrees) {
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return HEADINGS[index];
}

export function createHud() {
  const el = (id) => document.getElementById(id);
  const hud = {
    alt: el('hud-alt'),
    speed: el('hud-speed'),
    heading: el('hud-heading'),
    compass: el('hud-compass'),
    fuel: el('hud-fuel-fill'),
    fuelText: el('hud-fuel-text'),
    damage: el('hud-damage-fill'),
    score: el('hud-score'),
    rings: el('hud-rings'),
    objective: el('hud-objective'),
    message: el('hud-message'),
    vsi: el('hud-vsi'),
    clock: el('hud-clock'),
    title: el('overlay-title'),
    pause: el('overlay-pause'),
    end: el('overlay-end'),
    endTitle: el('end-title'),
    endLines: el('end-lines'),
    endScore: el('end-score'),
    panel: el('instruments'),
  };
  const ctx = el('instrument-canvas').getContext('2d');
  let messageTimer = 0;

  function drawInstruments(state, now) {
    const w = 300;
    const h = 92;
    ctx.clearRect(0, 0, w, h);
    // Artificial horizon.
    const cx = 46;
    const cy = 46;
    const radius = 34;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    const pitchOffset = Math.max(-20, Math.min(20, state.pitch * 60));
    const roll = state.roll;
    ctx.translate(cx, cy);
    ctx.rotate(-roll);
    ctx.translate(0, pitchOffset);
    ctx.fillStyle = '#2f6fd0';
    ctx.fillRect(-radius - 4, -radius - 4, radius * 2 + 8, radius + 4);
    ctx.fillStyle = '#7a5a33';
    ctx.fillRect(-radius - 4, 0, radius * 2 + 8, radius + 4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#f2b705';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Fixed wings marker.
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.stroke();
    // Digital readouts on the panel.
    ctx.fillStyle = '#eef1f5';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ALT ${Math.round(state.y * 3.28)} ft`, 96, 26);
    ctx.fillText(`SPD ${Math.round(state.speed * 1.94)} kt`, 96, 48);
    ctx.fillText(`HDG ${String(Math.round(((state.heading * 180) / Math.PI % 360 + 360) % 360)).padStart(3, '0')}°`, 96, 70);
    // Throttle bar.
    ctx.fillStyle = '#22303c';
    ctx.fillRect(196, 14, 14, 64);
    ctx.fillStyle = state.throttle > 0.85 ? '#ff5a1f' : '#2aff66';
    const th = state.throttle * 60;
    ctx.fillRect(198, 76 - th, 10, th);
    ctx.fillStyle = '#8b93a3';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('THR', 192, 90);
    // Stall warning blinks when slow.
    if (state.speed < 20 && state.status === 'flying') {
      ctx.fillStyle = Math.floor(now * 3) % 2 ? '#ff2a2a' : '#7a1010';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('STALL', 236, 30);
    }
  }

  return {
    /** Refreshes every HUD element from the flight state. */
    update(state, screen, cameraMode, now) {
      const degrees = ((state.heading * 180) / Math.PI % 360 + 360) % 360;
      hud.alt.textContent = `${Math.round(state.y * 3.28)} ft`;
      hud.speed.textContent = `${Math.round(state.speed * 1.94)} kt`;
      hud.heading.textContent = `${String(Math.round(degrees)).padStart(3, '0')}° ${compassLabel(degrees)}`;
      hud.compass.textContent = `◀ ${String(Math.round((degrees - 30 + 360) % 360)).padStart(3, '0')} · ${String(Math.round(degrees)).padStart(3, '0')} ${compassLabel(degrees)} · ${String(Math.round((degrees + 30) % 360)).padStart(3, '0')} ▶`;
      hud.fuel.style.width = `${Math.max(0, state.fuel)}%`;
      hud.fuel.style.background = state.fuel < 25 ? '#ff2a2a' : '#2aff66';
      hud.fuelText.textContent = `FUEL ${Math.round(state.fuel)}%`;
      hud.damage.style.width = `${state.damage}%`;
      hud.score.textContent = String(state.score);
      hud.rings.textContent = `${state.ringsPassed} / 6`;
      hud.vsi.textContent = `${state.verticalSpeed >= 0 ? '+' : ''}${Math.round(state.verticalSpeed * 196)} fpm`;
      const total = Math.floor(state.time);
      hud.clock.textContent = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      if (state.message) {
        hud.message.textContent = state.message;
        hud.message.style.opacity = '1';
        messageTimer = 3.2;
      } else if (messageTimer > 0) {
        messageTimer -= 1 / 60;
        if (messageTimer <= 0) hud.message.style.opacity = '0';
      }
      drawInstruments(state, now);
      hud.title.style.display = screen === 'title' ? 'flex' : 'none';
      hud.pause.style.display = screen === 'paused' ? 'flex' : 'none';
      hud.end.style.display = screen === 'over' ? 'flex' : 'none';
      hud.panel.style.opacity = screen === 'title' ? '0.55' : '1';
    },
    setObjective(text) {
      hud.objective.textContent = text;
    },
    showEnd(title, lines, score, best) {
      hud.endTitle.textContent = title;
      hud.endLines.innerHTML = lines.map((line) => `<div>${line}</div>`).join('');
      hud.endScore.textContent = `SCORE ${score} · BEST ${best}`;
    },
  };
}
