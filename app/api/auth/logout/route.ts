import { NextResponse } from 'next/server';
import { clearUserSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await clearUserSession();
    return NextResponse.json({ success: true, message: 'Signed out successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
