package com.goevent;

import com.goevent.repository.FileBookingRepository;
import com.goevent.repository.FileEventRepository;
import com.goevent.repository.FileUserRepository;
import com.goevent.service.BookingService;
import com.goevent.service.EventService;
import com.goevent.service.UserService;
import com.goevent.ui.ConsoleUi;

import java.nio.file.Path;
import java.util.Scanner;

/** Entry point. Wires the file repositories into the services, then starts the console menu. */
public final class GoEventApp {

    private GoEventApp() {
    }

    public static void main(String[] args) {
        Path dataDir = Path.of("data");
        UserService users = new UserService(new FileUserRepository(dataDir.resolve("users.csv")));
        EventService events = new EventService(new FileEventRepository(dataDir.resolve("events.csv")));
        BookingService bookings = new BookingService(new FileBookingRepository(dataDir.resolve("bookings.csv")), events);

        try (Scanner in = new Scanner(System.in)) {
            new ConsoleUi(in, users, events, bookings).run();
        }
    }
}
