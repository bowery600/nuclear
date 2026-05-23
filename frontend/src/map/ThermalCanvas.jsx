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

    const drawLabel = (text, x, y, accent = "rgba(165, 243, 252, 0.95)") => {
      ctx.save();
      ctx.font = `${Math.max(9, Math.min(12, 10 * transform.k))}px ui-monospace, SFMono-Regular, Consolas, monospace`;
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "0.4px";
      const paddingX = 6 * transform.k;
      const widthText = ctx.measureText(text).width;
      const boxW = widthText + paddingX * 2;
      const boxH = 18 * transform.k;
      const boxX = x - boxW / 2;
      const boxY = y - boxH / 2;
      const radius = Math.max(3, 4 * transform.k);

      ctx.fillStyle = "rgba(8, 13, 20, 0.86)";
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = Math.max(0.8, 1 * transform.k);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.fillText(text, x - widthText / 2, y + 0.5 * transform.k);
      ctx.restore();
    };

    const drawArrowHead = (x, y, angle, color, size) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size * 0.42);
      ctx.lineTo(-size, size * 0.42);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    const strokeCurve = ({ startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY, color, widthLine, dash }) => {
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = widthLine;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (dash) {
        ctx.setLineDash(dash);
        ctx.lineDashOffset = -time * 8 * transform.k;
      }
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.stroke();
      ctx.restore();
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

        // 1. Draw simulated, labeled cooling-water intake and thermal discharge.
        ctx.save();
        if (coolingType === "river") {
          const riverStartX = screenX - 76 * k;
          const riverStartY = screenY + 24 * k;
          const riverEndX = screenX + 82 * k;
          const riverEndY = screenY - 18 * k;
          const riverCp1x = screenX - 34 * k;
          const riverCp1y = screenY - 20 * k;
          const riverCp2x = screenX + 32 * k;
          const riverCp2y = screenY + 30 * k;

          strokeCurve({
            startX: riverStartX,
            startY: riverStartY,
            cp1x: riverCp1x,
            cp1y: riverCp1y,
            cp2x: riverCp2x,
            cp2y: riverCp2y,
            endX: riverEndX,
            endY: riverEndY,
            color: "rgba(14, 165, 233, 0.18)",
            widthLine: Math.max(8, 14 * k)
          });

          const intake = {
            startX: screenX - 58 * k,
            startY: screenY + 12 * k,
            cp1x: screenX - 36 * k,
            cp1y: screenY - 6 * k,
            cp2x: screenX - 18 * k,
            cp2y: screenY - 4 * k,
            endX: screenX - 4 * k,
            endY: screenY - 1 * k
          };
          const discharge = {
            startX: screenX + 4 * k,
            startY: screenY + 2 * k,
            cp1x: screenX + 22 * k,
            cp1y: screenY + 8 * k,
            cp2x: screenX + 42 * k,
            cp2y: screenY + 18 * k,
            endX: screenX + 66 * k,
            endY: screenY - 8 * k
          };

          strokeCurve({
            ...intake,
            color: "rgba(125, 211, 252, 0.7)",
            widthLine: Math.max(1.5, 2.6 * k),
            dash: [10 * k, 18 * k]
          });
          strokeCurve({
            ...discharge,
            color: "rgba(251, 146, 60, 0.72)",
            widthLine: Math.max(1.5, 2.6 * k),
            dash: [10 * k, 18 * k]
          });
          drawArrowHead(intake.endX, intake.endY, Math.atan2(intake.endY - intake.cp2y, intake.endX - intake.cp2x), "rgba(125, 211, 252, 0.9)", Math.max(5, 6 * k));
          drawArrowHead(discharge.endX, discharge.endY, Math.atan2(discharge.endY - discharge.cp2y, discharge.endX - discharge.cp2x), "rgba(251, 146, 60, 0.95)", Math.max(5, 6 * k));

          drawLabel("COOLING INTAKE", screenX - 56 * k, screenY - 18 * k, "rgba(186, 230, 253, 0.96)");
          drawLabel("THERMAL DISCHARGE", screenX + 62 * k, screenY + 18 * k, "rgba(253, 186, 116, 0.96)");
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

          const intake = {
            startX: lakeCX - lakeRadius * 0.95,
            startY: lakeCY - lakeRadius * 0.15,
            cp1x: screenX - 14 * k,
            cp1y: screenY + 24 * k,
            cp2x: screenX - 10 * k,
            cp2y: screenY + 8 * k,
            endX: screenX - 3 * k,
            endY: screenY
          };
          const discharge = {
            startX: screenX + 4 * k,
            startY: screenY + 2 * k,
            cp1x: screenX + 20 * k,
            cp1y: screenY + 6 * k,
            cp2x: lakeCX + lakeRadius * 0.45,
            cp2y: lakeCY - lakeRadius * 0.55,
            endX: lakeCX + lakeRadius * 0.9,
            endY: lakeCY - lakeRadius * 0.25
          };

          strokeCurve({
            ...intake,
            color: "rgba(125, 211, 252, 0.68)",
            widthLine: Math.max(1.5, 2.5 * k),
            dash: [10 * k, 18 * k]
          });
          strokeCurve({
            ...discharge,
            color: "rgba(251, 146, 60, 0.72)",
            widthLine: Math.max(1.5, 2.5 * k),
            dash: [10 * k, 18 * k]
          });
          drawArrowHead(intake.endX, intake.endY, Math.atan2(intake.endY - intake.cp2y, intake.endX - intake.cp2x), "rgba(125, 211, 252, 0.9)", Math.max(5, 6 * k));
          drawArrowHead(discharge.endX, discharge.endY, Math.atan2(discharge.endY - discharge.cp2y, discharge.endX - discharge.cp2x), "rgba(251, 146, 60, 0.95)", Math.max(5, 6 * k));

          drawLabel("COOLING WATER BODY", lakeCX, lakeCY + lakeRadius + 12 * k, "rgba(186, 230, 253, 0.96)");
          drawLabel("THERMAL DISCHARGE", lakeCX + lakeRadius * 1.15, lakeCY - lakeRadius * 0.72, "rgba(253, 186, 116, 0.96)");
        }
        drawLabel("PLANT HEAT EXCHANGER", screenX, screenY - 30 * k, "rgba(226, 232, 240, 0.96)");
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
