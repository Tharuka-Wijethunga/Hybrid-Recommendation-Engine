import { Search, X } from 'lucide-react'
import { useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onSubmit?: () => void
}

export default function SearchBar({ value, onChange, placeholder = 'Search…', onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative flex items-center">
      <Search size={16} className="absolute left-4 text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        className="input pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
          className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
