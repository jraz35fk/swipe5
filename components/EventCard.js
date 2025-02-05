const EventCard = ({ event }) => {
  const imageUrl = event.images && event.images.length ? event.images[0].url : '';
  return (
    <div className="event-card">
      {imageUrl && <img src={imageUrl} alt={event.name} />}
      <h3>{event.name}</h3>
      {event.dates && event.dates.start && (
        <p>{event.dates.start.localDate}</p>
      )}
      {event._embedded && event._embedded.venues && event._embedded.venues[0] && (
        <p>{event._embedded.venues[0].name}</p>
      )}
    </div>
  );
};

export default EventCard;
