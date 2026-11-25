import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
export function PageTitle({
  title,
  desc,
  label,
}: {
  title: string;
  desc?: string;
  label?: string;
}) {
  return (
    <div className="pagetitle">
      <div className="crumb">
        <Link href="/">Início</Link>
        <ChevronRight size={13} />
        {label || title}
      </div>
      <h1>
        {title}
        <span className="acid">.</span>
      </h1>
      {desc && <p>{desc}</p>}
    </div>
  );
}
