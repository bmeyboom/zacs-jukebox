import { NextResponse } from 'next/server';
import { getCurrentSong } from '../../actions';

export async function GET() {
  try {
    const data = await getCurrentSong();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API current-song error:', err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
