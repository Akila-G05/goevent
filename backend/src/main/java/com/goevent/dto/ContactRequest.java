package com.goevent.dto;

/** Public contact form submission. Clients cannot choose any stored column except these fields. */
public record ContactRequest(String email, String subject, String message) {}
