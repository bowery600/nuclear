import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause, RotateCcw, Clock, ShieldAlert, Award, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { TIMELINE_EVENTS, TIMELINE_START_YEAR, TIMELINE_END_YEAR } from "../data/historicalTimeline";

export default function TimelineSlider({ activeYear, onChangeYear }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // years per interval
  const [isCollapsed, setIsCollapsed] = useState(true); // Minimized by default
  const timerRef = useRef(null);

  // Speed multiplier label
  const speedLabel = useMemo(() => {
    if (playSpeed === 1) return "1x";
    if (playSpeed === 2) return "2x";
    return "4x";
  }, [playSpeed]);

  // Find the historical era corresponding to the active year
  const activeEra = useMemo(() => {
    return (
      TIMELINE_EVENTS.find((e) => activeYear >= e.startYear && activeYear <= e.endYear) ||
      TIMELINE_EVENTS[TIMELINE_EVENTS.length - 1]
    );
  }, [activeYear]);

  // Handle auto-playing year increments
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = playSpeed === 1 ? 1200 : playSpeed === 2 ? 800 : 400;

      timerRef.current = setInterval(() => {
        onChangeYear((prevYear) => {
          if (prevYear >= TIMELINE_END_YEAR) {
            setIsPlaying(false);
            return prevYear;
          }
          return Math.min(TIMELINE_END_YEAR, prevYear + 1);
        });
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playSpeed, onChangeYear]);

  // Toggle play state
  const handlePlayToggle = () => {
    if (activeYear >= TIMELINE_END_YEAR) {
      onChangeYear(TIMELINE_START_YEAR);
    }
    setIsPlaying(!isPlaying);
  };

  // Reset timeline
  const handleReset = () => {
    setIsPlaying(false);
    onChangeYear(2026); // Default to Present
  };

  // Change play speed
  const handleSpeedToggle = () => {
    setPlaySpeed((prevSpeed) => {
      if (prevSpeed === 1) return 2;
      if (prevSpeed === 2) return 4;
      return 1;
    });
  };

  // Define slider tick marks for key decades
  const decades = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2026, 2040, 2050];

  const getDecadeLabel = (year) => {
    if (year === 2026) return "Present";
    return year;
  };

  const handleHeaderClick = (e) => {
    // Expand if collapsed when clicking the header area (avoiding direct button clicks)
    if (isCollapsed && !e.target.closest("button")) {
      setIsCollapsed(false);
    }
  };

  return (
    <div
      className={`timeline-panel${isCollapsed ? " collapsed" : ""}`}
      aria-label="Historical Reactor Timeline"
      onClick={handleHeaderClick}
      style={isCollapsed ? { cursor: "pointer" } : undefined}
    >
      <div className="timeline-header">
        <div className="timeline-title-group">
          <Clock size={16} className="text-cyan animate-pulse" />
          <h3>Historical Fleet Simulator</h3>
          <span className="era-badge" data-category={activeEra.category}>
            {activeEra.title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="timeline-stats-preview">
            <span>Simulation Active Year:</span>
            <strong className="glowing-year">{activeYear === 2026 ? "2026 (Present)" : activeYear}</strong>
          </div>

          <button
            type="button"
            className="collapse-btn"
            onClick={(e) => {
              e.stopPropagation(); // Avoid double toggling
              setIsCollapsed(!isCollapsed);
            }}
            title={isCollapsed ? "Expand Simulator" : "Minimize Simulator"}
            aria-label={isCollapsed ? "Expand" : "Minimize"}
          >
            {isCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="timeline-control-row">
            <div className="timeline-actions">
              <button
                type="button"
                className={`timeline-btn play-btn ${isPlaying ? "playing" : ""}`}
                onClick={handlePlayToggle}
                title={isPlaying ? "Pause Timeline" : "Play Timeline"}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>

              <button
                type="button"
                className="timeline-btn speed-btn"
                onClick={handleSpeedToggle}
                title="Adjust Simulation Speed"
                aria-label={`Speed ${speedLabel}`}
              >
                {speedLabel}
              </button>

              <button
                type="button"
                className="timeline-btn reset-btn"
                onClick={handleReset}
                title="Reset to Present Day (2026)"
                aria-label="Reset to Present"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="timeline-slider-container">
              <input
                type="range"
                min={TIMELINE_START_YEAR}
                max={TIMELINE_END_YEAR}
                value={activeYear}
                onChange={(e) => {
                  setIsPlaying(false);
                  onChangeYear(parseInt(e.target.value, 10));
                }}
                className="timeline-range-input"
                aria-valuemin={TIMELINE_START_YEAR}
                aria-valuemax={TIMELINE_END_YEAR}
                aria-valuenow={activeYear}
                aria-valuetext={activeYear === 2026 ? "Present Day" : `${activeYear}`}
              />

              <div className="timeline-ticks">
                {decades.map((decade) => {
                  const isActive =
                    decade === 2026
                      ? activeYear === 2026
                      : activeYear >= decade && activeYear < decade + 10 && activeYear !== 2026;
                  const isPassed = decade <= activeYear;

                  return (
                    <button
                      key={decade}
                      type="button"
                      className={`timeline-tick ${isActive ? "active" : ""} ${isPassed ? "passed" : ""}`}
                      style={{
                        left: `${((decade - TIMELINE_START_YEAR) / (TIMELINE_END_YEAR - TIMELINE_START_YEAR)) * 100}%`
                      }}
                      onClick={() => {
                        setIsPlaying(false);
                        onChangeYear(decade);
                      }}
                    >
                      <span className="tick-dot" />
                      <span className="tick-label">{getDecadeLabel(decade)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="timeline-description-card" data-category={activeEra.category}>
            <div className="era-desc-header">
              <Calendar size={14} className="text-yellow" />
              <span>Historical Context ({activeEra.startYear} – {activeEra.endYear === 2050 ? "Present+" : activeEra.endYear})</span>
            </div>
            <p className="era-description-text">{activeEra.description}</p>
          </div>
        </>
      )}
    </div>
  );
}
