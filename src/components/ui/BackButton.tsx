import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href: string;
  text?: string;
}

export default function BackButton({ href, text = "Back" }: BackButtonProps) {
  return (
    <Link href={href}>
      <Button variant="outline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {text}
      </Button>
    </Link>
  );
}
