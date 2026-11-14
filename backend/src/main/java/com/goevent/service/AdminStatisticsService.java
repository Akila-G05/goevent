package com.goevent.service;

import com.goevent.repository.AdminStatisticsRepository;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@Service
public class AdminStatisticsService {
    private final AdminStatisticsRepository db;
    public AdminStatisticsService(AdminStatisticsRepository db) { this.db=db; }
    public Map<String,Object> report(Instant from,Instant to,Integer user) {
        AdminManagementService.require(from!=null&&to!=null&&to.isAfter(from)&&Duration.between(from,to).toDays()<=3660,400,"Use an increasing range no longer than 10 years");
        AdminManagementService.require(user==null||user>0,400,"Invalid user");
        return db.report(from,to,user);
    }
}
