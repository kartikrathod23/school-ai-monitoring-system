import pandas as pd

from src.config import (
    OUTPUT_DIR,
    ATTENDANCE_CSV_PATH
)


CONFIDENCE_CSV_PATH = (
    OUTPUT_DIR
    / "confidence_scores.csv"
)


class AttendanceCSVWriter:

    def __init__(self):
        pass

    # =====================================================
    # ATTENDANCE CSV
    # =====================================================

    def save_attendance(
        self,
        attendance_rows
    ):

        if len(
            attendance_rows
        ) == 0:

            print(
                "No attendance rows."
            )

            return

        attendance_df = (
            pd.DataFrame(
                attendance_rows
            )
        )

        attendance_df = (
            attendance_df
            .sort_values(
                "Date"
            )
        )

        attendance_df.to_csv(
            ATTENDANCE_CSV_PATH,
            index=False
        )

        print()
        print(
            "Attendance CSV Saved"
        )

        print(
            ATTENDANCE_CSV_PATH
        )

    # =====================================================
    # CONFIDENCE CSV
    # =====================================================

    def save_confidences(
        self,
        confidence_rows
    ):

        if len(
            confidence_rows
        ) == 0:

            print(
                "No confidence rows."
            )

            return

        confidence_df = (
            pd.DataFrame(
                confidence_rows
            )
        )

        confidence_df.to_csv(
            CONFIDENCE_CSV_PATH,
            index=False
        )

        print()
        print(
            "Confidence CSV Saved"
        )

        print(
            CONFIDENCE_CSV_PATH
        )

    # =====================================================
    # SAVE BOTH
    # =====================================================

    def save(
        self,
        attendance_rows,
        confidence_rows
    ):

        self.save_attendance(
            attendance_rows
        )

        self.save_confidences(
            confidence_rows
        )


# ============================================================
# PUBLIC FUNCTION
# ============================================================

def save_attendance_csv(
    attendance_rows,
    confidence_rows
):

    writer = (
        AttendanceCSVWriter()
    )

    writer.save(
        attendance_rows,
        confidence_rows
    )