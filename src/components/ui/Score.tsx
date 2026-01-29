interface ScoreProps {
  score: number | null;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function Score({ score, maxScore = 5, size = 'md', showLabel = false }: ScoreProps) {
  if (score === null) {
    return (
      <span className="text-brand-grey-400 text-sm">Not rated</span>
    );
  }

  const percentage = (score / maxScore) * 100;
  
  const getColour = () => {
    if (percentage >= 80) return 'bg-brand-green text-green-800';
    if (percentage >= 60) return 'bg-brand-cyan text-cyan-800';
    if (percentage >= 40) return 'bg-brand-gold text-amber-800';
    return 'bg-red-200 text-red-800';
  };

  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`
          ${sizes[size]} ${getColour()}
          rounded-full flex items-center justify-center font-semibold
        `}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-sm text-brand-grey-400">/ {maxScore}</span>
      )}
    </div>
  );
}

// Star rating display (readonly)
interface StarRatingDisplayProps {
  rating: number | null;
  maxRating?: number;
  size?: 'sm' | 'md';
  label?: string;
}

export function StarRatingDisplay({ rating, maxRating = 5, size = 'md', label }: StarRatingDisplayProps) {
  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {label && <span className="text-brand-grey-400">{label}:</span>}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }).map((_, i) => (
          <svg
            key={i}
            className={`${sizes[size]} ${
              rating !== null && i < rating ? 'text-amber-400' : 'text-brand-grey-200'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
}

// Interactive star rating input
interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  maxRating?: number;
  label?: string;
}

export function StarRating({ value, onChange, maxRating = 5, label }: StarRatingProps) {
  const handleClick = (rating: number) => {
    // If clicking the same star, toggle it off
    onChange(rating === value ? 0 : rating);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }).map((_, i) => {
          const starValue = i + 1;
          const isActive = starValue <= value;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(starValue)}
              className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
            >
              <svg
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-amber-400' : 'text-brand-grey-200 hover:text-amber-200'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
        <span className="ml-2 text-sm text-brand-grey-400">
          {value > 0 ? `${value}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );
}

// Progress bar for overall scores
interface ScoreBarProps {
  label: string;
  score: number | null;
  maxScore?: number;
}

export function ScoreBar({ label, score, maxScore = 5 }: ScoreBarProps) {
  const percentage = score !== null ? (score / maxScore) * 100 : 0;
  
  const getColour = () => {
    if (score === null) return 'bg-brand-grey-200';
    if (percentage >= 80) return 'bg-brand-green';
    if (percentage >= 60) return 'bg-brand-cyan';
    if (percentage >= 40) return 'bg-brand-gold';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-brand-slate-700">{label}</span>
        <span className="font-medium text-brand-slate-900">
          {score !== null ? `${score}/${maxScore}` : 'N/A'}
        </span>
      </div>
      <div className="h-2 bg-brand-grey-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${getColour()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
