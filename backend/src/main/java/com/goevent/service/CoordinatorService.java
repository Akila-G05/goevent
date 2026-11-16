package com.goevent.service;

import com.goevent.dto.CoordinatorRequests.*;
import com.goevent.repository.AdminRepository;
import com.goevent.repository.CoordinatorRepository;
import com.google.gson.Gson;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;

import java.time.*;
import java.util.*;
import java.net.URI;
import java.security.MessageDigest;
import java.io.IOException;
import javax.imageio.ImageIO;
import static com.goevent.service.AdminManagementService.*;

@Service
public class CoordinatorService {
    private final AdminRepository db;
    private final CoordinatorRepository repo;
    private final boolean campaignsEnabled;
    private final boolean enabled;
    private final Gson json=new Gson();
    public CoordinatorService(AdminRepository db,CoordinatorRepository repo,
        @Value("${app.coordinator.campaigns-enabled:false}") boolean campaignsEnabled,
        @Value("${app.coordinator.enabled:true}") boolean enabled) {
        this.db=db; this.repo=repo; this.campaignsEnabled=campaignsEnabled; this.enabled=enabled;
    }
    private void active(int user) { require(enabled,409,"Coordinator entry points are disabled"); require(db.active(user),403,"Active account required"); }
    private void lock() { db.lock(); }
    public void member(int user,int org) { require(enabled,409,"Coordinator entry points are disabled"); require(repo.member(user,org),403,"Approved organization membership required"); }
    public Map<String,Object> catalog(int user) {
        active(user); return Map.of("categories",repo.categories(),
            "organizations",repo.organizations(),
            "organizationTypes",repo.organizationTypes(),
            "universities",repo.universities());
    }
    public List<Map<String,Object>> workspaces(int user) { active(user); return repo.workspaces(user); }
    public List<Map<String,Object>> applications(int user) { return applications(user,0,100); }
    public List<Map<String,Object>> applications(int user,int page,int size) {
        active(user); return repo.applications(user,size,offset(page,size));
    }
    @Transactional public long apply(int user,Application input) {
        lock(); active(user); require(input!=null,400,"Application required");
        if(input.organizationId()!=null) {
            require(db.organization(input.organizationId()),400,"Unknown organization");
            require(!repo.member(user,input.organizationId()),409,"Organization access already approved");
            require(input.proposedName()==null||input.proposedName().isBlank(),400,"Select an organization or propose one");
        } else {
            text(input.proposedName(),45,"organization name");
            require(input.proposedTypeId()!=null&&repo.organizationTypeCount(input.proposedTypeId())==1,400,"Organization type required");
        }
        documentOwned(user,input.proofId(),"AUTHORIZATION");
        String position=text(input.position(),45,"committee position"), explanation=text(input.explanation(),10000,"explanation");
        try {
            return repo.createApplication(user,input.organizationId(),input.organizationId()==null?input.proposedName().trim():null,
                input.organizationId()==null?input.proposedTypeId():null,position,email(input.contactEmail()),
                text(input.contactPhone(),30,"contact phone"),explanation,explanation.substring(0,Math.min(200,explanation.length())),input.proofId());
        } catch(DataIntegrityViolationException error) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"A pending application already exists for this organization"); }
    }
    @Transactional public void reviewApplication(int actor,long id,Review input) {
        lock(); require(db.admin(actor),403,"Active administrator required");
        var row=db.coordinator(id); require(row!=null,404,"Application not found");
        require(number(row,"status_id")==1,409,"Application already reviewed");
        int user=number(row,"user_id"); require(user!=actor,409,"Cannot review your own application"); active(user);
        String reason=text(input.reason(),1000,"reason");
        if(input.approve()) {
            documentOwned(user,row.get("proof_id")==null?null:((Number)row.get("proof_id")).longValue(),"AUTHORIZATION");
            Integer org=row.get("organization_id")==null?input.organizationId():Integer.valueOf(number(row,"organization_id"));
            if(org==null) {
                require(input.createOrganization()&&row.get("proposed_name")!=null&&row.get("proposed_type_id")!=null,400,"Link an organization or confirm its creation");
                org=(int)repo.createOrganization((String)row.get("proposed_name"),number(row,"proposed_type_id"));
                db.audit(actor,"CREATE_ORGANIZATION","ORGANIZATION",org,reason);
            }
            require(db.organization(org),400,"Unknown organization");
            require(!repo.member(user,org),409,"Membership already approved");
            require(repo.pendingApplications(user,org,id)==0,409,"Another pending application already targets this organization; review it first");
            repo.linkApplication(org,id);
            db.grantCoordinator(user,org,text((String)row.get("position"),45,"position"));
            repo.recordMembershipDecision(actor,reason,user,org);
        }
        db.decideCoordinator(id,actor,input.approve(),reason);
        db.audit(actor,input.approve()?"APPROVE_COORDINATOR":"REJECT_COORDINATOR","REQUEST",id,reason);
        db.email(row.get("email").toString(),"GoEvent organization access review",reason);
    }
    @Transactional public void revokeMembership(int actor,long membership,String reason) {
        lock(); require(db.admin(actor),403,"Active administrator required"); reason=text(reason,1000,"reason");
        var row=repo.membership(membership); require(row!=null,404,"Membership not found");
        require("APPROVED".equals(row.get("access_state")),409,"Membership already revoked");
        repo.revokeMembership(actor,reason,membership);
        repo.revokeApprovedApplications(number(row,"user_id"),number(row,"organization_id"));
        db.audit(actor,"REVOKE_MEMBERSHIP","MEMBERSHIP",membership,reason);
    }
    public List<Map<String,Object>> memberships(int user) { return repo.memberships(user); }
    @Transactional public long upload(int user,String purpose,MultipartFile file) throws IOException {
        active(user); if("EVENT".equals(purpose))require(!repo.workspaces(user).isEmpty(),403,"Approved membership required for event documents");
        require(Set.of("AUTHORIZATION","EVENT").contains(purpose),400,"Invalid document purpose");
        require(file!=null&&!file.isEmpty()&&file.getSize()<=10*1024*1024,400,"Proof must be at most 10 MB");
        byte[] bytes=file.getBytes(); String type=file.getContentType();
        boolean pdf=bytes.length>12&&new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")
            &&new String(bytes,Math.max(0,bytes.length-1024),Math.min(1024,bytes.length),java.nio.charset.StandardCharsets.ISO_8859_1).contains("%%EOF");
        boolean png=bytes.length>8&&bytes[0]==(byte)137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71;
        boolean jpeg=bytes.length>3&&bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
        boolean valid="application/pdf".equals(type)&&pdf;
        if(("image/png".equals(type)&&png)||("image/jpeg".equals(type)&&jpeg)) {
            // Read dimensions before decoding to prevent compressed image allocation attacks.
            try(var stream=ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))) {
                var readers=ImageIO.getImageReaders(stream);
                if(readers.hasNext()) {
                    var reader=readers.next();
                    try { reader.setInput(stream); valid=(long)reader.getWidth(0)*reader.getHeight(0)<=20_000_000&&reader.read(0)!=null; }
                    finally { reader.dispose(); }
                }
            }
        }
        require(valid,400,"Content must match PDF, JPEG or PNG");
        return repo.storeDocument(user,purpose,type,bytes.length,hash(bytes),bytes);
    }
    static String hash(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch(java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
    private void documentOwned(int user,Long id,String purpose) {
        require(id!=null&&repo.ownedDocumentCount(id,user,purpose)==1,400,"Private "+purpose.toLowerCase(Locale.ROOT)+" document required");
    }
    public Map<String,Object> document(int user,boolean admin,long id) {
        active(user); var row=repo.document(id);
        require(row!=null,404,"Document not found"); require((admin&&db.admin(user))||number(row,"owner_id")==user,403,"Private document access denied"); return row;
    }
    private Map<String,Object> owned(int user,int org,int id) {
        member(user,org); var row=repo.event(id); require(row!=null,404,"Event not found");
        require(row.get("organization_id")!=null&&number(row,"organization_id")==org&&number(row,"published_by")==user,403,"Event ownership required"); return row;
    }
    private Map<String,Object> editable(int user,int org,int id,int version) {
        var row=owned(user,org,id); require(number(row,"revision")==version,409,"Event changed; refresh before editing");
        require(row.get("disabled_at")==null,409,"Event cancelled"); return row;
    }
    public Map<String,Object> detail(int user,int org,int id) {
        var row=owned(user,org,id); row.put("workingRevision",row.get("working_revision_id")==null?null:repo.revision(((Number)row.get("working_revision_id")).longValue())); return row;
    }
    public List<Map<String,Object>> events(int user,int org,String phase,Instant from,Instant to,int page,int size) {
        member(user,org); require(Set.of("ALL","DRAFT","PENDING","REJECTED","UPCOMING","ONGOING","COMPLETED","CANCELLED","UNKNOWN").contains(phase),400,"Invalid event state");
        int offset=offset(page,size); if(from!=null&&to!=null) range(from,to);
        return repo.events(user,org,phase,from==null?null:utc(from),to==null?null:utc(to),size,offset);
    }
    public static int offset(int page,int size) { require(page>=0&&page<=100000&&size>=1&&size<=100,400,"Invalid pagination"); return page*size; }
    static void range(Instant from,Instant to) { require(from!=null&&to!=null&&to.isAfter(from)&&Duration.between(from,to).toDays()<=3660,400,"Invalid date range (maximum 3660 days)"); }
    public Map<String,Object> statistics(int user,int org,Instant from,Instant to) { return statistics(user,org,from,to,null); }
    public Map<String,Object> statistics(int user,int org,Instant from,Instant to,Integer eventId) {
        if(eventId==null) member(user,org);
        else { require(eventId>0,400,"Invalid event"); owned(user,org,eventId); }
        range(from,to); return repo.statistics(user,org,utc(from),utc(to),eventId);
    }
    private static LocalDateTime utc(Instant instant) { return LocalDateTime.ofInstant(instant,ZoneOffset.UTC); }
    private Instant instant(String value) {
        try { return Instant.parse(value); } catch(RuntimeException error) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Explicit UTC instant required"); }
    }
    private void url(String value,int max) {
        if(value==null||value.isBlank())return;
        require(value.length()<=max,400,"URL too long");
        try { var uri=URI.create(value); require("https".equals(uri.getScheme())&&uri.getHost()!=null&&uri.getUserInfo()==null,400,"HTTPS URL required"); }
        catch(IllegalArgumentException error) { require(false,400,"Invalid URL"); }
    }
    private void image(String value) {
        if(value==null||value.isBlank()) return;
        require(value.length()<=200&&((value.startsWith("/goevent/api/images/event/")||value.startsWith("/goevent/api/images/banner/"))||value.startsWith("https://")),400,"Uploaded event image or HTTPS URL required");
        if(value.startsWith("https://"))url(value,200);
    }
    private void validate(int user,Event value) {
        require(value!=null,400,"Event content required"); text(value.name(),100,"name"); text(value.description(),20000,"description");
        require(value.description().getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=65535,400,"Description exceeds database text size");
        require(repo.categoryCount(value.categoryId())==1,400,"Unknown category");
        require(Set.of(1,2,3).contains(value.audienceId())&&Set.of(1,2,3).contains(value.eventLevelId()),400,"Invalid audience/event level");
        text(value.venueName(),45,"venue"); text(value.venueCity(),45,"city");
        require(value.venueAddress()==null||value.venueAddress().length()<=150,400,"Address too long");
        try { ZoneId.of(value.timezone()); } catch(RuntimeException error) { require(false,400,"Valid IANA timezone required"); }
        var start=instant(value.startsAt()); var end=instant(value.endsAt()); require(end.isAfter(start),400,"End must follow start");
        image(value.imagePath()); image(value.bannerPath()); url(value.videoUrl(),200);
        require(value.confirmationMessage()==null||value.confirmationMessage().length()<=2000,400,"Confirmation message too long");
        require(value.minimumAge()>=0&&value.minimumAge()<=120&&value.bookingLimit()>=1&&value.bookingLimit()<=100,400,"Invalid age or booking limit");
        require(value.currency()!=null&&value.currency().matches("[A-Z]{3}"),400,"ISO currency required");
        try { Currency.getInstance(value.currency()); } catch(IllegalArgumentException error) { require(false,400,"Unknown currency"); }
        universities(value.universityIds());
        require(value.audienceId()!=1||!value.universityIds().isEmpty(),400,"Select eligible universities");
        require(value.packages()!=null&&value.packages().size()<=3,400,"At most three packages");
        require(value.eventLevelId()==1?value.packages().isEmpty():!value.packages().isEmpty(),400,"Ticket events need packages; listing-only events have none");
        for(var tier:value.packages()) {
            require(tier!=null,400,"Invalid package");
            text(tier.name(),100,"package name"); text(tier.benefits(),2000,"benefits");
            require(tier.quantity()>0&&tier.quantity()<=1000000,400,"Invalid package quantity");
            BigDecimal price=tier.price(); require(price!=null&&price.signum()>=0&&price.scale()<=2&&price.compareTo(new BigDecimal("9999999999.99"))<=0,400,"Invalid decimal price");
            require(value.eventLevelId()!=2||price.signum()==0,400,"Free packages must cost zero");
            require(value.eventLevelId()!=3||price.signum()>0,400,"Paid packages must have positive prices");
            var saleStart=instant(tier.saleStartsAt()); var saleEnd=instant(tier.saleEndsAt());
            require(saleEnd.isAfter(saleStart)&&!saleEnd.isAfter(end),400,"Invalid package sale window"); universities(tier.universityIds());
            require(value.audienceId()!=1||value.universityIds().containsAll(tier.universityIds()),400,"Package universities must match the event audience");
        }
        if(value.approvalDocumentId()!=null)documentOwned(user,value.approvalDocumentId(),"EVENT");
    }
    private void universities(List<Integer> ids) {
        require(ids!=null&&ids.size()<=100,400,"Invalid university selection");
        for(Integer id:ids)require(id!=null&&repo.universityCount(id)==1,400,"Unknown university");
    }
    @Transactional public long create(int user,int org,Event value) {
        lock(); member(user,org); validate(user,value);
        long venue=repo.createVenue(value.venueName(),value.venueAddress(),value.venueCity());
        long image=repo.createImage(Objects.requireNonNullElse(value.imagePath(),""),value.bannerPath());
        long link=repo.createVideoLink(Objects.requireNonNullElse(value.videoUrl(),""));
        int id=(int)repo.createDraft(value.name(),value.description(),value.categoryId(),venue,value.audienceId(),value.eventLevelId(),image,link,user,org);
        saveRevision(user,id,1,value); db.audit(user,"CREATE_DRAFT","EVENT",id,"Draft saved"); return id;
    }
    private void saveRevision(int user,int id,int version,Event value) {
        long revision=repo.createRevision(id,version,json.toJson(value),user);
        repo.setWorkingRevision(revision,version,id);
    }
    @Transactional public void save(int user,int org,int id,Save input) {
        lock(); var row=editable(user,org,id,input.revision());
        var working=row.get("working_revision_id")==null?null:repo.revision(((Number)row.get("working_revision_id")).longValue());
        require(working==null||!"PENDING".equals(working.get("review_state")),409,"Submitted revision is frozen until reviewed");
        validate(user,input.content()); saveRevision(user,id,input.revision()+1,input.content());
        db.audit(user,"SAVE_REVISION","EVENT",id,"Proposed content saved");
    }
    @Transactional public void submit(int user,int org,int id,int version) {
        lock(); var row=editable(user,org,id,version); require(row.get("working_revision_id")!=null,409,"Save a draft first");
        var revision=repo.revision(((Number)row.get("working_revision_id")).longValue());
        require("DRAFT".equals(revision.get("review_state")),409,"Save a corrected revision before resubmitting");
        var value=json.fromJson(revision.get("content").toString(),Event.class); validate(user,value);
        require(value.approvalDocumentId()!=null,400,"Private event approval document required before submission");
        require(instant(value.startsAt()).isAfter(Instant.now()),400,"Submitted event must start in the future");
        repo.submitRevision(((Number)revision.get("id")).longValue());
        repo.markSubmitted(id);
        db.audit(user,"SUBMIT_EVENT","EVENT",id,"Revision submitted for review");
    }
    @Transactional public void reviewEvent(int actor,int id,boolean approve,int version,String reason) {
        lock(); require(db.admin(actor),403,"Active administrator required");
        var row=repo.event(id); require(row!=null,404,"Event not found");
        require(number(row,"revision")==version&&row.get("disabled_at")==null,409,"Event changed or cancelled; refresh first");
        require(row.get("organization_id")!=null&&row.get("working_revision_id")!=null,409,"Organization and submitted revision required");
        var revision=repo.revision(((Number)row.get("working_revision_id")).longValue());
        require("PENDING".equals(revision.get("review_state")),409,"Only pending revisions can be reviewed");
        reason=text(reason,1000,"reason");
        if(approve) {
            int owner=number(row,"published_by"),org=number(row,"organization_id"); member(owner,org);
            var value=json.fromJson(revision.get("content").toString(),Event.class); validate(owner,value);
            require(value.approvalDocumentId()!=null,409,"Submitted revision requires private approval proof");
            boolean rescheduled=(row.get("published_revision_id")!=null||number(row,"event_status_id")==2)&&(!utc(instant(value.startsAt())).equals(row.get("starts_at"))||!utc(instant(value.endsAt())).equals(row.get("ends_at")));
            repo.publish(value.name(),value.description(),value.categoryId(),value.audienceId(),value.eventLevelId(),utc(instant(value.startsAt())),utc(instant(value.endsAt())),((Number)revision.get("id")).longValue(),actor,id);
            long venue=repo.createVenue(value.venueName(),value.venueAddress(),value.venueCity());
            long image=repo.createImage(Objects.requireNonNullElse(value.imagePath(),""),value.bannerPath());
            long link=repo.createVideoLink(Objects.requireNonNullElse(value.videoUrl(),""));
            repo.setPublishedAssets(venue,image,link,id);
            if(rescheduled)repo.notice(id,org,owner,"Event rescheduled: "+value.name(),"The approved schedule is now "+value.startsAt()+" to "+value.endsAt()+" (timezone "+value.timezone()+").",value.timezone());
        }
        repo.reviewRevision(approve?"APPROVED":"REJECTED",actor,reason,((Number)revision.get("id")).longValue());
        repo.finishReview(reason,approve?2:3,id);
        db.audit(actor,approve?"APPROVE_EVENT":"REJECT_EVENT","EVENT",id,reason);
    }
    public Map<String,Object> adminRevision(int actor,long id) {
        require(db.admin(actor),403,"Active administrator required"); var row=repo.revision(id);
        require(row!=null,404,"Revision not found"); return row;
    }
    @Transactional public void assign(int actor,int id,Assignment input) {
        lock(); require(db.admin(actor),403,"Active administrator required"); var row=repo.event(id); require(row!=null,404,"Event not found");
        require(row.get("organization_id")==null,409,"Event already assigned"); require(db.organization(input.organizationId()),400,"Unknown organization");
        repo.assignOrganization(input.organizationId(),id); db.audit(actor,"ASSIGN_EVENT_ORGANIZATION","EVENT",id,text(input.reason(),1000,"reason"));
    }
    @Transactional public void remove(int user,int org,int id,Removal input,boolean delete) {
        lock(); var row=editable(user,org,id,input.revision()); String reason=text(input.reason(),1000,"reason");
        if(delete) {
            require(row.get("published_revision_id")==null&&number(row,"event_status_id")==4,409,"Only unpublished drafts can be deleted");
            // Own revisions are draft content, not dependent bookings/history. All other FKs block deletion.
            require(repo.submittedHistoryCount(id)==0,409,"Submitted history must be preserved");
            repo.deleteDraftRevisions(id);
            require(!db.referencedEvent(id),409,"Dependent records exist; cancel instead"); db.deleteEvent(id);
        } else cancel(row,user,reason);
        db.audit(user,delete?"DELETE_DRAFT":"CANCEL_EVENT","EVENT",id,reason);
    }
    private void cancel(Map<String,Object> row,int actor,String reason) {
        int id=number(row,"id"); db.disableEvent(id,reason);
        if(row.get("published_revision_id")!=null||number(row,"event_status_id")==2) {
            String timezone="UNKNOWN";
            if(row.get("published_revision_id")!=null) timezone=json.fromJson(repo.revision(((Number)row.get("published_revision_id")).longValue()).get("content").toString(),Event.class).timezone();
            Integer org=row.get("organization_id")==null?null:Integer.valueOf(number(row,"organization_id"));
            repo.notice(id,org,number(row,"published_by"),"Event cancelled: "+row.get("name"),reason+"\nContact the organizer about eligibility; no automatic refund has been performed.",timezone);
        }
        repo.cancelUnstartedCampaigns(id);
    }
    @Transactional public void adminCancel(int actor,int id,String reason) {
        lock(); require(db.admin(actor),403,"Active administrator required"); var row=repo.event(id); require(row!=null,404,"Event not found"); require(row.get("disabled_at")==null,409,"Event already cancelled");
        reason=text(reason,1000,"reason"); cancel(row,actor,reason); db.audit(actor,"CANCEL_EVENT","EVENT",id,reason);
    }
    @Transactional public String export(int user,int org,int id) {
        lock(); owned(user,org,id); require(repo.bookingCount(id)<=10000,409,"Export exceeds 10000 bookings; contact administrator");
        var csv=new StringBuilder("booking_reference,first_name,last_name,email,booked_at\r\n");
        for(var row:repo.attendees(id,0,10000))csv.append(csvCell(row.get("booking_reference"))).append(',').append(csvCell(row.get("fname"))).append(',').append(csvCell(row.get("lname"))).append(',').append(csvCell(row.get("email"))).append(',').append(csvCell(row.get("created_at"))).append("\r\n");
        db.audit(user,"EXPORT_ATTENDEES","EVENT",id,"Attendee CSV exported"); return csv.toString();
    }
    public static String csvCell(Object value) {
        String text=value==null?"":value.toString();
        int first=0; while(first<text.length()&&(Character.isWhitespace(text.charAt(first))||Character.isSpaceChar(text.charAt(first))||text.charAt(first)=='\uFEFF'))first++;
        String trimmed=text.substring(first);
        if(!trimmed.isEmpty()&&"=+-@\t\r\n".indexOf(trimmed.charAt(0))>=0||(!text.isEmpty()&&"\t\r\n".indexOf(text.charAt(0))>=0))text="'"+text;
        return "\""+text.replace("\"","\"\"")+"\"";
    }
    @Transactional public long campaign(int user,int org,int id,Campaign input) {
        lock(); var row=owned(user,org,id); require(campaignsEnabled,409,"Participant campaigns are disabled pending configuration review");
        require(input.confirm(),400,"Explicit recipient confirmation required"); require(row.get("disabled_at")==null&&row.get("published_revision_id")!=null,409,"Approved active event required");
        var value=json.fromJson(repo.revision(((Number)row.get("published_revision_id")).longValue()).get("content").toString(),Event.class);
        Instant at=Instant.now();
        if(input.scheduledLocal()!=null&&!input.scheduledLocal().isBlank()) {
            try {
                var local=LocalDateTime.parse(input.scheduledLocal()); var zone=ZoneId.of(value.timezone()); var offsets=zone.getRules().getValidOffsets(local);
                require(offsets.size()==1,400,"Schedule is ambiguous or nonexistent in event timezone"); at=local.toInstant(offsets.getFirst()); require(at.isAfter(Instant.now()),400,"Schedule must be in the future");
            } catch(java.time.DateTimeException error) { require(false,400,"Invalid event-local schedule"); }
        }
        long campaign=repo.createCampaign(id,org,user,text(input.subject(),200,"subject"),text(input.message(),10000,"message"),utc(at),value.timezone());
        db.audit(user,"CREATE_CAMPAIGN","CAMPAIGN",campaign,"Participant email confirmed"); return campaign;
    }
    public List<Map<String,Object>> campaigns(int user,int org,int event,int page,int size) {
        owned(user,org,event); return repo.campaigns(event,size,offset(page,size));
    }
    @Transactional public void cancelCampaign(int user,int org,int event,long id) {
        lock(); owned(user,org,event); require(repo.cancelCampaign(id,event)==1,409,"Only undispatched campaigns can be cancelled");
        db.audit(user,"CANCEL_CAMPAIGN","CAMPAIGN",id,"Cancelled before dispatch");
    }
}
