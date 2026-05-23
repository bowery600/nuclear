import { useEffect, useRef } from "react";

export default function ThermalCanvas({ width, height, transform, projectedPlants, selectedPlantId, show }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!show || !canvasRef.current || !width || !height) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let time = 0;

    // Helper to check if a plant is river-cooled or lake/ocean-cooled
    const getCoolingType = (plantName) => {
      const name = (plantName || "").toLowerCase();
      if (
        name.includes("river") ||
        name.includes("creek") ||
        name.includes("fork") ||
        name.includes("valley") ||
        name.includes("canal")
      ) {
        return "river";
      }
      if (
        name.includes("lake") ||
        name.includes("bay") ||
        name.includes("harbor") ||
        name.includes("beach") ||
        name.includes("ocean") ||
        name.includes("point") ||
        name.includes("shore") ||
        name.includes("cove")
      ) {
        return "lake";
      }
      return "river"; // Default to river
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.05;

      const selectedPlants = projectedPlants.filter((p) => {
        const id = p.feature?.properties?.id ?? p.feature?.id;
        return String(id) === String(selectedPlantId);
      });

      selectedPlants.forEach((p) => {
        const props = p.feature.properties || {};
        const isDecommissioned = props.timelineStatus === "Decommissioned";
        const isConstruction = props.timelineStatus === "Construction";
        
        // Hide environmental overlay for planned/construction/decommissioned plants
        if (isDecommissioned || isConstruction) return;

        // Calculate active screen position based on current D3 transform
        const screenX = transform.x + p.x * transform.k;
        const screenY = transform.y + p.y * transform.k;

        // Skip drawing if coordinates are off-screen to optimize performance
        if (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100) {
          return;
        }

        const capacity = Number(props.total_mw_capacity) || 1000;
        const output = Number(props.current_mw_output) || 0;
        const isRefueling = output === 0;

        // Determine cooling source type
        const coolingType = getCoolingType(props.plant_name);
        const k = transform.k;

        // 1. Draw Simulated Localized Cooling Water Sources
        ctx.save();
        if (coolingType === "river") {
          // Draw a connected cooling-water path through the selected plant.
          ctx.beginPath();
          ctx.lineWidth = Math.max(2, 4 * k);
          ctx.strokeStyle = "rgba(0, 212, 255, 0.28)";
          ctx.shadowColor = "rgba(0, 212, 255, 0.4)";
          ctx.shadowBlur = Math.max(2, 6 * k);

          const startX = screenX - 64 * k;
          const startY = screenY + 18 * k;
          const cp1x = screenX - 28 * k;
          const cp1y = screenY - 18 * k;
          const cp2x = screenX - 12 * k;
          const cp2y = screenY - 6 * k;
          const plantInletX = screenX;
          const plantInletY = screenY;
          const cp3x = screenX + 12 * k;
          const cp3y = screenY + 6 * k;
          const cp4x = screenX + 32 * k;
          const cp4y = screenY + 20 * k;
          const endX = screenX + 70 * k;
          const endY = screenY - 14 * k;

          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, plantInletX, plantInletY);
          ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, endX, endY);
          ctx.stroke();

          // Flowing water dashes overlay representing active current
          ctx.beginPath();
          ctx.lineWidth = Math.max(1.2, 2.2 * k);
          ctx.strokeStyle = "rgba(165, 243, 252, 0.65)";
          ctx.setLineDash([12 * k, 35 * k]);
          ctx.lineDashOffset = -time * 8 * k;
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, plantInletX, plantInletY);
          ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, endX, endY);
          ctx.stroke();
        } else {
          // Draw a connected lake/reservoir interface centered on the selected plant.
          ctx.beginPath();
          const lakeRadius = Math.max(14, 26 * k);
          const lakeCX = screenX + 14 * k;
          const lakeCY = screenY + 14 * k;
          
          ctx.arc(lakeCX, lakeCY, lakeRadius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 140, 235, 0.08)";
          ctx.strokeStyle = "rgba(0, 140, 235, 0.22)";
          ctx.lineWidth = Math.max(1, 2 * k);
          ctx.shadowColor = "rgba(0, 140, 235, 0.35)";
          ctx.shadowBlur = Math.max(2, 6 * k);
          ctx.fill();
          ctx.stroke();

          // Concentric flowing ripples inside the lake
          ctx.beginPath();
          const rippleRadius = (lakeRadius * 0.45) + ((time * 3) % (lakeRadius * 0.5));
          ctx.arc(lakeCX, lakeCY, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(14, 165, 233, ${0.4 * (1 - (rippleRadius / lakeRadius))})`;
          ctx.lineWidth = Math.max(0.6, 1.2 * k);
          ctx.stroke();
        }
        ctx.restore();

        // 2. Draw Simulated Thermal Discharge Plumes
        if (!isRefueling && output > 0) {
          ctx.save();
          const plumeIntensity = output / capacity; // 0.0 to 1.0
          const plumeMaxRadius = Math.max(12, (20 + plumeIntensity * 18) * k);
          const pulseOffset = Math.sin(time * 1.6) * 3 * k;
          const activeRadius = Math.max(4, plumeMaxRadius + pulseOffset);

          // Thermal discharge originates from the selected plant node.
          const originX = screenX;
          const originY = screenY;

          // Glowing radial gradient: Magenta/Violet (hot discharge) fading to blue/transparent (cooling)
          const grad = ctx.createRadialGradient(
            originX,
            originY,
            1,
            originX,
            originY,
            activeRadius
          );
          
          // Ultra-premium glowing thermal colors: magenta -> violet -> cyan -> transparent
          grad.addColorStop(0, "rgba(217, 70, 239, 0.82)");
          grad.addColorStop(0.35, "rgba(168, 85, 247, 0.45)");
          grad.addColorStop(0.7, "rgba(6, 182, 212, 0.18)");
          grad.addColorStop(1, "rgba(6, 182, 212, 0)");

          ctx.beginPath();
          ctx.arc(originX, originY, activeRadius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        }

        // 3. Draw Regional Grid Carbon-Intensity Reductions
        if (output > 0) {
          ctx.save();
          // Expanding green waves radiating outward from the plant
          // Wave propagation speed and max size depends on the plant's baseload MW output
          const maxWaveRadius = Math.max(30, (50 + (output / 25)) * k);
          const speedFactor = 0.5 + (output / 2000); // larger plants pulse faster
          
          // Render 2 concentric wave ripples
          for (let w = 0; w < 2; w++) {
            const waveProgress = ((time * speedFactor + w * 1.5) % 3) / 3; // 0 to 1
            const waveRadius = waveProgress * maxWaveRadius;
            
            if (waveRadius > 0) {
              const alpha = 0.52 * (1 - waveProgress); // Fade out as it expands
              ctx.beginPath();
              ctx.arc(screenX, screenY, waveRadius, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(74, 222, 128, ${alpha})`;
              ctx.lineWidth = Math.max(0.8, (2.0 * (1 - waveProgress)) * k);
              ctx.stroke();

              // Subtle glowing fill on the grid reduction boundary
              if (w === 0) {
                ctx.beginPath();
                ctx.arc(screenX, screenY, waveRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(74, 222, 128, ${alpha * 0.045})`;
                ctx.fill();
              }
            }
          }
          ctx.restore();
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [show, width, height, transform, projectedPlants, selectedPlantId]);

  if (!show) return null;

  return (
    <canvas
      ref={canvasRef}
      className="thermal-canvas"
      width={width}
      height={height}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2, // Placed overlaying the map paths but below tooltips/HUD
      }}
    />
  );
}
