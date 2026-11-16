package com.goevent.repository;

import com.goevent.model.Booking;
import com.goevent.util.CsvUtil;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

/** Row layout: id, viewerId, eventId, ticketName, quantity, total, bookedAt. */
public class FileBookingRepository extends CsvRepository<Booking> implements BookingRepository {

    public FileBookingRepository(Path file) {
        super(file);
    }

    @Override
    public List<Booking> findByViewer(int viewerId) {
        return findAll().stream().filter(booking -> booking.getViewerId() == viewerId).toList();
    }

    @Override
    protected int idOf(Booking booking) {
        return booking.getId();
    }

    @Override
    protected String toLine(Booking booking) {
        return CsvUtil.line(String.valueOf(booking.getId()), String.valueOf(booking.getViewerId()),
                String.valueOf(booking.getEventId()), booking.getTicketName(),
                String.valueOf(booking.getQuantity()), booking.getTotal().toPlainString(),
                booking.getBookedAt().toString());
    }

    @Override
    protected Booking fromLine(String line) {
        List<String> fields = CsvUtil.parse(line);
        return new Booking(
                Integer.parseInt(fields.get(0)),
                Integer.parseInt(fields.get(1)),
                Integer.parseInt(fields.get(2)),
                fields.get(3),
                Integer.parseInt(fields.get(4)),
                new BigDecimal(fields.get(5)),
                LocalDateTime.parse(fields.get(6)));
    }
}
