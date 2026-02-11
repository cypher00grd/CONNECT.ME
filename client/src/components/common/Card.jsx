const Card = ({
  children,
  className = '',
  hover = false,
  padding = true,
  onClick,
}) => {
  return (
    <div
      className={`
        card
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${padding ? 'p-4 sm:p-6' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
