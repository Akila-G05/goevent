package com.goevent.repository;

import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;

@Repository
public class AdminStatisticsRepository {
    private final AdminRepository db;
    public AdminStatisticsRepository(AdminRepository db) { this.db=db; }
    public Map<String,Object> report(Instant start,Instant end,Integer user) {
        var from=Timestamp.from(start); var to=Timestamp.from(end);
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("fromInclusive",start.toString()); result.put("toExclusive",end.toString());
        result.put("eventTimeZone","Asia/Colombo");
        result.put("currentAccounts",db.rows("SELECT role_id,user_status_id,COUNT(*) AS count FROM `user` WHERE (? IS NULL OR id=?) GROUP BY role_id,user_status_id",user,user));
        result.put("registrations",db.count("SELECT COUNT(*) FROM `user` WHERE registered_date>=? AND registered_date<? AND (? IS NULL OR id=?)",from,to,user,user));
        result.put("currentEventStates",db.rows("SELECT event_status_id,COUNT(*) AS count FROM `event` WHERE (? IS NULL OR published_by=?) GROUP BY event_status_id",user,user));
        result.put("eventsCreated",db.count("SELECT COUNT(*) FROM `event` WHERE created_at>=? AND created_at<? AND (? IS NULL OR published_by=?)",from,to,user,user));
        result.put("eventsWithoutCreationTime",db.count("SELECT COUNT(*) FROM `event` WHERE created_at IS NULL AND (? IS NULL OR published_by=?)",user,user));
        result.put("requestsSubmitted",db.count("SELECT COUNT(*) FROM `request` WHERE created_at>=? AND created_at<? AND role_id=2 AND (? IS NULL OR user_id=?)",from,to,user,user));
        result.put("currentCoordinatorRequests",db.rows("SELECT status_id,COUNT(*) AS count FROM `request` WHERE role_id=2 AND (? IS NULL OR user_id=?) GROUP BY status_id",user,user));
        result.put("coordinatorDecisions",db.rows("SELECT status_id,COUNT(*) AS count FROM `request` WHERE role_id=2 AND reviewed_at>=? AND reviewed_at<? AND (? IS NULL OR user_id=?) GROUP BY status_id",from,to,user,user));
        result.put("currentEventSchedule",db.rows("SELECT CASE WHEN disabled_at IS NOT NULL THEN 'DISABLED' WHEN starts_at IS NULL THEN 'UNKNOWN' WHEN starts_at>UTC_TIMESTAMP(6) THEN 'UPCOMING' WHEN ends_at>UTC_TIMESTAMP(6) THEN 'ONGOING' ELSE 'COMPLETED' END AS phase,COUNT(*) AS count FROM `event` WHERE (? IS NULL OR published_by=?) GROUP BY phase",user,user));
        result.put("requestsWithoutSubmissionTime",db.count("SELECT COUNT(*) FROM `request` WHERE created_at IS NULL AND role_id=2 AND (? IS NULL OR user_id=?)",user,user));
        String bookingScope=" FROM booking b JOIN `event` e ON e.id=b.event_id WHERE b.created_at>=? AND b.created_at<? AND (? IS NULL OR b.user_id=? OR e.published_by=?)";
        result.put("bookings",db.count("SELECT COUNT(*)"+bookingScope,from,to,user,user,user));
        result.put("bookingAmounts",db.rows("SELECT 'UNKNOWN' AS currency,SUM(CAST(b.total_amount AS DECIMAL(24,4))) AS amount"+bookingScope,from,to,user,user,user));
        result.put("paymentOutcomes",db.rows("SELECT p.p_status_id,COALESCE(p.currency,'UNKNOWN') AS currency,COUNT(*) AS count FROM payment p JOIN booking b ON b.id=p.booking_id JOIN `event` e ON e.id=b.event_id WHERE p.created_at>=? AND p.created_at<? AND (? IS NULL OR b.user_id=? OR e.published_by=?) GROUP BY p.p_status_id,p.currency",from,to,user,user,user));
        // Accept only canonical non-negative decimal amounts. Never silently cast
        // malformed VARCHAR values to zero or claim unknown-currency values are LKR.
        result.put("paymentAmounts",db.rows("SELECT p.p_status_id,COALESCE(p.currency,'UNKNOWN') AS currency,COUNT(*) AS records,SUM(CASE WHEN p.amount REGEXP '^[0-9]{1,18}([.][0-9]{1,4})?$' THEN CAST(p.amount AS DECIMAL(24,4)) ELSE NULL END) AS amount,SUM(CASE WHEN p.amount REGEXP '^[0-9]{1,18}([.][0-9]{1,4})?$' THEN 0 ELSE 1 END) AS invalid_amounts FROM payment p JOIN booking b ON b.id=p.booking_id JOIN `event` e ON e.id=b.event_id WHERE p.created_at>=? AND p.created_at<? AND (? IS NULL OR b.user_id=? OR e.published_by=?) GROUP BY p.p_status_id,p.currency",from,to,user,user,user));
        result.put("ticketQuantities",db.rows("SELECT SUM(CASE WHEN bi.qty REGEXP '^[0-9]{1,9}$' THEN CAST(bi.qty AS UNSIGNED) ELSE NULL END) AS booked_quantity,SUM(CASE WHEN bi.qty REGEXP '^[0-9]{1,9}$' THEN 0 ELSE 1 END) AS invalid_quantities FROM booking_item bi JOIN booking b ON b.id=bi.booking_id JOIN `event` e ON e.id=b.event_id WHERE b.created_at>=? AND b.created_at<? AND (? IS NULL OR b.user_id=? OR e.published_by=?)",from,to,user,user,user));
        result.put("issuedTickets",db.rows("SELECT tc.ticket_status_id,COUNT(*) AS count FROM ticket_code tc JOIN booking_item bi ON bi.id=tc.booking_item_id JOIN booking b ON b.id=bi.booking_id JOIN `event` e ON e.id=b.event_id WHERE tc.issued_at>=? AND tc.issued_at<? AND (? IS NULL OR b.user_id=? OR e.published_by=?) GROUP BY tc.ticket_status_id",from,to,user,user,user));
        result.put("financialNotice","Payment outcomes are current states grouped by creation time. REFUNDED is a status, not an independently recorded refund ledger. Booked quantities are not confirmed paid sales. Unknown currencies remain unclassified; these are not reconciled revenue figures.");
        return result;
    }
}
