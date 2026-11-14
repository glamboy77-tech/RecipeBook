const paths = {
  book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Z" /><path d="M12 5v15M5 8h3M5 11h3M16 8h3M16 11h3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  arrow: <path d="m9 5 7 7-7 7" />,
  back: <path d="m14 5-7 7 7 7M7 12h14" />,
  share: <><path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  minus: <path d="M5 12h14" />,
  plus: <path d="M5 12h14M12 5v14" />,
  check: <path d="m5 12 4 4L19 6" />,
  people: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" /></>,
  bowl: <><path d="M3 12h18a9 9 0 0 1-18 0ZM7 21h10M8 3v4m4-5v5m4-4v4" /></>,
  play: <path d="m8 4 12 8-12 8V4Z" />,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
  reset: <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  sound: <><path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  muted: <><path d="m11 4-6 5H2v6h3l6 5V4Zm6 5 5 6m-5 0 5-6" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
};

export default function Icon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
