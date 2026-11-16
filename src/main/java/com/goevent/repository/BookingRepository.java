package com.goevent.repository;

import com.goevent.model.Booking;

import java.util.List;

public interface BookingRepository extends Repository<Booking> {

    List<Booking> findByViewer(int viewerId);
}
