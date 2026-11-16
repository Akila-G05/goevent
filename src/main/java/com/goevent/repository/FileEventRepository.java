package com.goevent.repository;

import com.goevent.model.Event;
import com.goevent.model.Ticket;
import com.goevent.model.TicketType;
import com.goevent.util.CsvUtil;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Row layout: id, organizerId, title, venue, startsAt, tickets.
 * The tickets field holds one entry per ticket type, separated by ';', and each
 * entry holds its parts separated by '|'. Every part is encoded so the separators
 * are never ambiguous.
 */
public class FileEventRepository extends CsvRepository<Event> implements EventRepository {

    public FileEventRepository(Path file) {
        super(file);
    }

    @Override
    public List<Event> findByOrganizer(int organizerId) {
        return findAll().stream().filter(event -> event.getOrganizerId() == organizerId).toList();
    }

    @Override
    protected int idOf(Event event) {
        return event.getId();
    }

    @Override
    protected String toLine(Event event) {
        return CsvUtil.line(String.valueOf(event.getId()), String.valueOf(event.getOrganizerId()),
                event.getTitle(), event.getVenue(), event.getStartsAt().toString(),
                encodeTickets(event.getTickets()));
    }

    @Override
    protected Event fromLine(String line) {
        List<String> fields = CsvUtil.parse(line);
        return new Event(
                Integer.parseInt(fields.get(0)),
                Integer.parseInt(fields.get(1)),
                fields.get(2),
                fields.get(3),
                LocalDateTime.parse(fields.get(4)),
                decodeTickets(fields.get(5)));
    }

    private static String encodeTickets(List<Ticket> tickets) {
        return tickets.stream()
                .map(ticket -> String.join("|",
                        CsvUtil.encode(ticket.type().name()),
                        CsvUtil.encode(ticket.getName()),
                        CsvUtil.encode(ticket.getUnitPrice().toPlainString()),
                        CsvUtil.encode(String.valueOf(ticket.getCapacity())),
                        CsvUtil.encode(String.valueOf(ticket.getSold()))))
                .collect(Collectors.joining(";"));
    }

    private static List<Ticket> decodeTickets(String field) {
        if (field.isBlank()) {
            return List.of();
        }
        return Arrays.stream(field.split(";"))
                .map(entry -> entry.split("\\|", -1))
                .map(parts -> Ticket.create(
                        TicketType.valueOf(CsvUtil.decode(parts[0])),
                        CsvUtil.decode(parts[1]),
                        new BigDecimal(CsvUtil.decode(parts[2])),
                        Integer.parseInt(CsvUtil.decode(parts[3])),
                        Integer.parseInt(CsvUtil.decode(parts[4]))))
                .toList();
    }
}
