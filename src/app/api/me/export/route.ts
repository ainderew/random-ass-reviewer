import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/api-response';
import { requireUserId } from '@/server/require-user';
import { exportUserData } from '@/server/services/user-export';

// One JSON file with everything the product holds about the user.
export const GET = handleRoute(async () => {
  const userId = await requireUserId();
  const data = await exportUserData(userId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="aloft-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
});
