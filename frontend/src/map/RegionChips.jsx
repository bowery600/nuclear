export default function RegionChips({ regions, activeCode, onJump, onReset }) {
  return (
    <div className="region-chips" role="toolbar" aria-label="ISO regions">
      <button
        type="button"
        className={`region-chip${!activeCode ? " is-active" : ""}`}
        onClick={onReset}
      >
        All US
      </button>
      {regions.map((region) => (
        <button
          key={region.code}
          type="button"
          className={`region-chip${activeCode === region.code ? " is-active" : ""}`}
          onClick={() => onJump(region)}
          title={region.name}
        >
          {region.code}
        </button>
      ))}
    </div>
  );
}
