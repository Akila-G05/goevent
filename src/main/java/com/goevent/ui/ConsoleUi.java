package com.goevent.ui;

import com.goevent.exception.GoEventException;
import com.goevent.exception.ValidationException;
import com.goevent.model.*;
import com.goevent.service.BookingService;
import com.goevent.service.EventService;
import com.goevent.service.UserService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

/** Text menus for guests, organizers and viewers. Business rules stay in the services. */
public class ConsoleUi {

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final Scanner in;
    private final UserService users;
    private final EventService events;
    private final BookingService bookings;

    public ConsoleUi(Scanner in, UserService users, EventService events, BookingService bookings) {
        this.in = in;
        this.users = users;
        this.events = events;
        this.bookings = bookings;
    }

    public void run() {
        while (true) {
            System.out.println("\n=== GoEvent ===");
            System.out.println("1. Log in");
            System.out.println("2. Register as organizer");
            System.out.println("3. Register as viewer");
            System.out.println("0. Exit");
            String choice = ask("Choose");
            if ("0".equals(choice)) {
                System.out.println("Goodbye.");
                return;
            }
            safely(() -> guestAction(choice));
        }
    }

    private void guestAction(String choice) {
        switch (choice) {
            case "1" -> {
                User user = users.login(ask("Email"), ask("Password"));
                System.out.println("Welcome, " + user.getName() + ".");
                userMenu(user);
            }
            case "2" -> {
                users.registerOrganizer(ask("Name"), ask("Email"), ask("Password"));
                System.out.println("Organizer account created. You can log in now.");
            }
            case "3" -> {
                users.registerViewer(ask("Name"), ask("Email"), ask("Password"));
                System.out.println("Viewer account created. You can log in now.");
            }
            default -> System.out.println("Unknown option.");
        }
    }

    private void userMenu(User user) {
        List<String> options = user.menuOptions();
        String logOut = String.valueOf(options.size());
        while (true) {
            System.out.println("\n-- " + user.role() + " menu --");
            for (int i = 0; i < options.size(); i++) {
                System.out.println((i + 1) + ". " + options.get(i));
            }
            String choice = ask("Choose");
            if (logOut.equals(choice)) {
                return;
            }
            safely(() -> userAction(user, choice));
        }
    }

    private void userAction(User user, String choice) {
        if (user instanceof Organizer organizer) {
            switch (choice) {
                case "1" -> createEvent(organizer);
                case "2" -> printEvents(events.eventsOf(organizer));
                default -> System.out.println("Unknown option.");
            }
        } else if (user instanceof Viewer viewer) {
            switch (choice) {
                case "1" -> printEvents(events.browse(ask("Search (leave empty for all)")));
                case "2" -> bookTickets(viewer);
                case "3" -> printBookings(bookings.bookingsOf(viewer));
                default -> System.out.println("Unknown option.");
            }
        }
    }

    private void createEvent(Organizer organizer) {
        String title = ask("Event title");
        String venue = ask("Venue");
        LocalDateTime startsAt = parseDateTime(ask("Start (yyyy-MM-dd HH:mm)"));
        int typeCount = parseInt(ask("Number of ticket types"));

        List<Ticket> tickets = new ArrayList<>();
        for (int i = 1; i <= typeCount; i++) {
            System.out.println("Ticket type " + i);
            TicketType type = "2".equals(ask("Type (1 = standard, 2 = VIP)")) ? TicketType.VIP : TicketType.STANDARD;
            String name = ask("Name");
            BigDecimal price = parseDecimal(ask("Price"));
            int capacity = parseInt(ask("Capacity"));
            tickets.add(Ticket.create(type, name, price, capacity, 0));
        }

        Event event = events.createEvent(organizer, title, venue, startsAt, tickets);
        System.out.println("Created event #" + event.getId() + ".");
    }

    private void bookTickets(Viewer viewer) {
        printEvents(events.browse(""));
        Event event = events.getEvent(parseInt(ask("Event id")));
        String ticketName = ask("Ticket name");
        int quantity = parseInt(ask("Quantity"));

        Booking booking = bookings.book(viewer, event.getId(), ticketName, quantity);
        System.out.println("Booked " + booking.getQuantity() + " x " + booking.getTicketName()
                + " for " + booking.getTotal() + ". Booking #" + booking.getId() + ".");
    }

    private void printEvents(List<Event> list) {
        if (list.isEmpty()) {
            System.out.println("No events found.");
            return;
        }
        for (Event event : list) {
            System.out.println("#" + event.getId() + " " + event.getTitle() + " | " + event.getVenue()
                    + " | " + event.getStartsAt().format(DATE_TIME));
            for (Ticket ticket : event.getTickets()) {
                System.out.println("    " + ticket.getName() + " (" + ticket.type() + ") " + ticket.getUnitPrice()
                        + " | " + ticket.remaining() + " left | " + ticket.perks());
            }
        }
    }

    private void printBookings(List<Booking> list) {
        if (list.isEmpty()) {
            System.out.println("You have no bookings.");
            return;
        }
        for (Booking booking : list) {
            System.out.println("#" + booking.getId() + " event #" + booking.getEventId() + ": "
                    + booking.getQuantity() + " x " + booking.getTicketName() + ", total " + booking.getTotal()
                    + ", booked " + booking.getBookedAt().format(DATE_TIME));
        }
    }

    private void safely(Runnable action) {
        try {
            action.run();
        } catch (GoEventException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }

    private String ask(String prompt) {
        System.out.print(prompt + ": ");
        return in.nextLine().trim();
    }

    private static LocalDateTime parseDateTime(String text) {
        try {
            return LocalDateTime.parse(text, DATE_TIME);
        } catch (DateTimeParseException e) {
            throw new ValidationException("Use the format yyyy-MM-dd HH:mm.");
        }
    }

    private static BigDecimal parseDecimal(String text) {
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException e) {
            throw new ValidationException("Price must be a number.");
        }
    }

    private static int parseInt(String text) {
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            throw new ValidationException("Expected a whole number.");
        }
    }
}
