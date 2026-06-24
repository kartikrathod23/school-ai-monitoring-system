from src.attendance.attendance_generator import (
    generate_attendance_records
)

from src.attendance.csv_writer import (
    save_attendance_csv
)


def main():

    print()
    print("=" * 60)
    print("GENERATE ATTENDANCE")
    print("=" * 60)

    # --------------------------------------------------
    # Generate attendance records
    # --------------------------------------------------

    (
        attendance_rows,
        confidence_rows
    ) = generate_attendance_records()

    # --------------------------------------------------
    # Save CSV files
    # --------------------------------------------------

    save_attendance_csv(
        attendance_rows,
        confidence_rows
    )

    print()
    print("=" * 60)
    print("ATTENDANCE PIPELINE COMPLETE")
    print("=" * 60)

    print()

    print("Generated Files")

    print()

    print(
        "output/attendance.csv"
    )

    print(
        "output/confidence_scores.csv"
    )

    print()

    print(
        "output/AttendanceFaces/"
    )

    print()

    print(
        f"Attendance Records : "
        f"{len(attendance_rows)}"
    )

    print(
        f"Confidence Records : "
        f"{len(confidence_rows)}"
    )

    print()


if __name__ == "__main__":

    main()
    