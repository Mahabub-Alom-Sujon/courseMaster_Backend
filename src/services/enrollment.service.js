const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

const enrollCourse = async (studentId, courseId, batchId = null) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }
  let enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });
  if (enrollment) {
    throw new Error("Already enrolled in this course");
  }
  enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
    batchId,
    progress: {
      completedLessons: [],
      percent: 0,
    },
  });

  return enrollment;
};

const getMyEnrollments = async (studentId) => {
  return Enrollment.find({ student: studentId })
      .populate("course", "title instructorName price category tags")
      .sort({ createdAt: -1 });
};

const completeLesson = async (enrollId, lessonId) => {
  const enrollment = await Enrollment.findById(enrollId);
  if (!enrollment) {
    throw new Error("Enrollment not found");
  }
  if (!lessonId) {
    throw new Error("Lesson ID is required");
  }
  const course = await Course.findById(enrollment.course);
  if (!course) {
    throw new Error("Course not found");
  }
  const syllabus = Array.isArray(course.syllabus) ? course.syllabus : [];
  // Count all lessons in the course
  const allLessons = syllabus.flatMap((module) =>
      Array.isArray(module.lessons) ? module.lessons : []
  );
  const totalLessons = allLessons.length;
  // Verify that this lesson belongs to the enrolled course
  const lessonExists = allLessons.some(
      (lesson) => String(lesson._id) === String(lessonId)
  );
  if (!lessonExists) {
    throw new Error("Lesson not found in this course");
  }
  // Ensure progress structure exists
  if (!enrollment.progress) {
    enrollment.progress = {
      completedLessons: [],
      percent: 0,
    };
  }
  if (!Array.isArray(enrollment.progress.completedLessons)) {
    enrollment.progress.completedLessons = [];
  }
  // Prevent duplicate completion
  const alreadyDone = enrollment.progress.completedLessons
      .some((id) => String(id) === String(lessonId));

  if (!alreadyDone) {
    enrollment.progress.completedLessons.push(lessonId);
  }
  // Calculate progress without exceeding 100%
  const completed = enrollment.progress.completedLessons.length;
  enrollment.progress.percent = totalLessons === 0 ? 0 : Math.min(100, Math.round((completed / totalLessons) * 100));

  // Code-9 fix: wait until MongoDB saves the changes
  await enrollment.save();
  return enrollment;
};

module.exports = { enrollCourse, getMyEnrollments, completeLesson };
