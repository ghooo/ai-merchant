interface WidgetCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

export default function WidgetCard({
  icon,
  title,
  description,
  onClick,
}: WidgetCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-500 hover:shadow-md transition-all"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </button>
  );
}
