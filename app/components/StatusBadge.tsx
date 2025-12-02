interface StatusBadgeProps {
  status: 'Healthy' | 'Low' | 'Critical' | 'Out of Stock' | string;
}

const statusStyles: Record<string, string> = {
  Healthy: 'bg-green-100 text-green-800',
  Low: 'bg-yellow-100 text-yellow-800',
  Critical: 'bg-red-100 text-red-800',
  'Out of Stock': 'bg-gray-900 text-white',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
