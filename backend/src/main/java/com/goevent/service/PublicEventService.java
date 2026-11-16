package com.goevent.service;

import com.goevent.repository.CoordinatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.goevent.service.AdminManagementService.require;

@Service
public class PublicEventService {
    private final CoordinatorRepository db;
    public PublicEventService(CoordinatorRepository db) { this.db=db; }
    public List<Map<String,Object>> list(int page,int size) {
        int offset=CoordinatorService.offset(page,size);
        return db.publicEvents(size,offset);
    }
    public Map<String,Object> event(int id) {
        var row=db.publicEvent(id);
        require(row!=null,404,"Published event not found");
        // Private document identifiers never enter public responses.
        if(row.get("content")!=null) {
            var content=com.google.gson.JsonParser.parseString(row.get("content").toString()).getAsJsonObject();
            content.remove("approvalDocumentId"); row.put("content",content.toString());
        }
        return row;
    }
    @Transactional public void impression(int id,String session) {
        event(id); String hash=CoordinatorService.hash(session.getBytes(StandardCharsets.UTF_8));
        db.ensureImpression(id,hash);
        if(db.recordImpression(id,hash)==1)
            db.incrementImpressions(id);
    }
}
