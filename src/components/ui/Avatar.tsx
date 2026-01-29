import { getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const initials = getInitials(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`
          ${sizes[size]} 
          rounded-full object-cover border-2 border-white shadow-soft
          ${className}
        `}
      />
    );
  }

  return (
    <div
      className={`
        ${sizes[size]} 
        rounded-full bg-gradient-to-br from-brand-slate-700 to-brand-slate-900 
        flex items-center justify-center text-white font-semibold
        border-2 border-white shadow-soft
        ${className}
      `}
    >
      {initials}
    </div>
  );
}

// Avatar group for showing multiple people
interface AvatarGroupProps {
  users: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  const overlapSizes = {
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
  };

  const counterSizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div className="flex items-center">
      {displayUsers.map((user, index) => (
        <div key={index} className={index > 0 ? overlapSizes[size] : ''}>
          <Avatar name={user.name} src={user.src} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div 
          className={`
            ${overlapSizes[size]} ${counterSizes[size]}
            rounded-full bg-brand-grey-200 
            flex items-center justify-center text-brand-slate-700 font-medium
            border-2 border-white shadow-soft
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
