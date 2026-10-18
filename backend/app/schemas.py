from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator


class AuthorOrderItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    authorId: int = Field(..., ge=1, description="ID of the author")
    authorOrder: int = Field(1, ge=1, le=10, description="Order of authorship (1-based)")
    isCorresponding: bool = Field(False, description="Whether this author is the corresponding author")


class PaperCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(..., min_length=1, max_length=250, description="Title of the paper")
    abstract: str = Field(..., min_length=1, max_length=1000, description="Abstract of the paper")
    confId: int = Field(..., ge=1, description="Target conference ID")
    trackId: int = Field(..., ge=1, description="Target track ID")
    authorIds: Optional[List[int]] = Field(default=None, max_length=10, description="List of author IDs in order")
    correspondingAuthorId: Optional[int] = Field(default=None, ge=1, description="Author ID of the corresponding author")
    authors: Optional[List[AuthorOrderItem]] = Field(default=None, max_length=10, description="Detailed author ordering")
    keywordIds: List[int] = Field(default_factory=list, max_length=10, description="List of keyword IDs")

    @model_validator(mode="after")
    def validate_authors_and_keywords(self) -> "PaperCreate":
        if not self.authors and not self.authorIds:
            raise ValueError("At least one author must be specified (via authors or authorIds).")
        if self.authors and len(self.authors) > 10:
            raise ValueError("A paper cannot have more than 10 authors.")
        if self.authorIds and len(self.authorIds) > 10:
            raise ValueError("A paper cannot have more than 10 author IDs.")

        # Check for duplicate author IDs (B8)
        ids = [a.authorId for a in self.authors] if self.authors else (self.authorIds or [])
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate author IDs are not permitted for a paper.")

        # Check corresponding author is among specified authors (B8)
        if self.correspondingAuthorId and self.correspondingAuthorId not in ids:
            raise ValueError(f"Corresponding author ID {self.correspondingAuthorId} is not in the list of authors.")

        # Check duplicate keywords (B8)
        if len(self.keywordIds) != len(set(self.keywordIds)):
            raise ValueError("Duplicate keyword IDs are not permitted.")

        return self


class PaperUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(None, min_length=1, max_length=250)
    abstract: Optional[str] = Field(None, min_length=1, max_length=1000)
    status: Optional[str] = Field(None, pattern="^(Submitted|Under Review|Accepted|Rejected)$")

    @model_validator(mode="after")
    def validate_at_least_one_field(self) -> "PaperUpdate":
        if self.title is None and self.abstract is None and self.status is None:
            raise ValueError("At least one field ('title', 'abstract', or 'status') must be provided for update.")
        return self


class PaperDeleteConfirm(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirm: bool = Field(..., description="Must be true to confirm paper deletion")


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reviewerId: int = Field(..., ge=1, description="ID of the reviewer to assign")


class ReviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reviewerId: int = Field(..., ge=1, description="ID of the reviewing reviewer")
    score: int = Field(..., ge=0, le=10, description="Review score from 0 to 10")
    comments: str = Field(..., min_length=1, max_length=1000, description="Review comments/feedback")
    recommendation: str = Field(..., pattern="^(Accept|Reject|Minor Revision|Major Revision)$", description="Recommendation decision")


class OracleAssignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    paperId: int = Field(..., ge=1, description="ID of the paper")
    reviewerId: int = Field(..., ge=1, description="ID of the reviewer")
    commit: bool = Field(False, description="If True, commits the assignment; otherwise performs a safe dry-run")
    confirm: Optional[bool] = Field(False, description="Confirmation flag required if commit is True")
