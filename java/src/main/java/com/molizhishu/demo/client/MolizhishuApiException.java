package com.molizhishu.demo.client;

public class MolizhishuApiException extends RuntimeException {

	private final Integer code;

	private final int httpStatus;

	public MolizhishuApiException(String message, Integer code, int httpStatus) {
		super(message);
		this.code = code;
		this.httpStatus = httpStatus;
	}

	public Integer getCode() {
		return code;
	}

	public int getHttpStatus() {
		return httpStatus;
	}

}
